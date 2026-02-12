import json
import os
from typing import Dict, Any, List
import modal
import cv2
import base64
from PIL import Image
import io
import numpy as np
import yt_dlp
import whisper
import re
import requests
from bs4 import BeautifulSoup
import time
from urllib.parse import urlparse, parse_qs

# Create Modal app - THIS MUST BE FIRST
app = modal.App("social-video-recipe-extractor")

# Define the image with dependencies optimized for social media
image = (
    modal.Image.from_registry("python:3.11")
    .run_commands([
        "apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*"
    ])
    .pip_install([
        "numpy<2.0",  
        "yt-dlp",
        "openai", 
        "requests",
        "beautifulsoup4",  
        "lxml",
        "opencv-python-headless==4.8.1.78",
        "Pillow", 
        "openai-whisper",
        "whisper",
        "fastapi[standard]"
    ])
)

# ENHANCED: Universal Platform Detection
def detect_platform_from_url_enhanced(video_url):
    """Enhanced platform detection for universal video support"""
    if not video_url:
        return "unknown"
        
    url_lower = video_url.lower()
    
    # Social media platforms with video content
    if "tiktok.com" in url_lower or "vm.tiktok.com" in url_lower:
        return "tiktok"
    elif "instagram.com" in url_lower:
        return "instagram"
    elif "facebook.com" in url_lower or "fb.watch" in url_lower:
        return "facebook"
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"
    elif "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    elif "reddit.com" in url_lower or "redd.it" in url_lower:
        return "reddit"
    elif "pinterest.com" in url_lower:
        return "pinterest"
    elif "snapchat.com" in url_lower:
        return "snapchat"
    elif "bsky.app" in url_lower or "bluesky.app" in url_lower:
        return "bluesky"
    elif "linkedin.com" in url_lower:
        return "linkedin"
    elif "threads.net" in url_lower:
        return "threads"
    
    # Direct video file URLs
    elif any(ext in url_lower for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']):
        return "direct_video"
    
    # Generic video platform detection
    elif any(keyword in url_lower for keyword in ['video', 'watch', 'play', 'stream']):
        return "generic_video"
    
    return "unknown"

# ENHANCED: Universal Page Scraper
def scrape_page_content(url, platform, user_agent_type='mobile'):
    """Universal page scraper for extracting recipe content from social media posts"""
    
    # Platform-specific headers
    headers = {
        'mobile': {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        },
        'desktop': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
        }
    }
    
    try:
        print(f"🌐 Scraping {platform} page content from: {url}")
        
        # Try mobile first, then desktop
        for agent_type in [user_agent_type, 'desktop' if user_agent_type == 'mobile' else 'mobile']:
            try:
                response = requests.get(url, headers=headers[agent_type], timeout=15)
                
                if response.status_code == 200:
                    print(f"✅ Successfully fetched {platform} page with {agent_type} user agent")
                    return response.text, response.status_code
                elif response.status_code == 429:
                    print(f"⚠️ Rate limited on {platform}, waiting 5 seconds...")
                    time.sleep(5)
                    continue
                else:
                    print(f"⚠️ {platform} returned status {response.status_code} with {agent_type} agent")
                    
            except requests.exceptions.Timeout:
                print(f"⚠️ Timeout fetching {platform} with {agent_type} agent")
                continue
            except Exception as e:
                print(f"⚠️ Error fetching {platform} with {agent_type} agent: {e}")
                continue
        
        # If both agents fail, return None
        return None, None
        
    except Exception as e:
        print(f"❌ Failed to scrape {platform} page: {e}")
        return None, None

# ENHANCED: Platform-specific content extractors
def extract_twitter_content(url, page_content):
    """Extract recipe content from Twitter/X posts"""
    print("🐦 Extracting content from Twitter/X post...")
    
    try:
        soup = BeautifulSoup(page_content, 'html.parser')
        extracted_content = {
            'text_content': [],
            'meta_content': [],
            'recipe_indicators': []
        }
        
        # Method 1: Look for tweet text in various possible containers
        tweet_selectors = [
            '[data-testid="tweetText"]',
            '.tweet-text',
            '.TweetTextSize',
            '[role="article"] div[lang]',
            'div[data-testid="tweetText"]'
        ]
        
        for selector in tweet_selectors:
            tweet_elements = soup.select(selector)
            for element in tweet_elements:
                text = element.get_text().strip()
                if text and len(text) > 20:
                    extracted_content['text_content'].append(text)
        
        # Method 2: Extract meta tags
        meta_tags = ['description', 'og:description', 'twitter:description']
        for meta_name in meta_tags:
            meta_tag = soup.find('meta', attrs={'name': meta_name}) or soup.find('meta', property=meta_name)
            if meta_tag:
                content = meta_tag.get('content', '')
                if content and len(content) > 30:
                    extracted_content['meta_content'].append(content)
        
        # Method 3: Look for recipe keywords in page text
        recipe_keywords = ['recipe', 'ingredient', 'cook', 'bake', 'mix', 'add', 'cup', 'tbsp', 'tsp', 'minute', 'hour', 'prep', 'serves']
        page_text = soup.get_text().lower()
        
        for keyword in recipe_keywords:
            if keyword in page_text:
                extracted_content['recipe_indicators'].append(keyword)
        
        # Method 4: Extract from JSON-LD structured data
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and 'description' in data:
                    extracted_content['meta_content'].append(data['description'])
            except:
                continue
        
        # Combine all text content
        all_text = ' '.join(extracted_content['text_content'] + extracted_content['meta_content'])
        
        return {
            'success': len(all_text) > 50,
            'content': all_text,
            'recipe_indicators': extracted_content['recipe_indicators'],
            'platform': 'twitter',
            'extraction_method': 'page_scraping'
        }
        
    except Exception as e:
        print(f"❌ Twitter content extraction error: {e}")
        return {'success': False, 'error': str(e)}

def extract_youtube_content(url, page_content):
    """Extract recipe content from YouTube videos"""
    print("📺 Extracting content from YouTube video...")
    
    try:
        soup = BeautifulSoup(page_content, 'html.parser')
        extracted_content = {
            'title': '',
            'description': '',
            'transcript': []
        }
        
        # Extract video title
        title_tag = soup.find('meta', property='og:title')
        if title_tag:
            extracted_content['title'] = title_tag.get('content', '')
        
        # Extract video description
        desc_tag = soup.find('meta', property='og:description')
        if desc_tag:
            extracted_content['description'] = desc_tag.get('content', '')
        
        # Look for recipe content in description
        recipe_content = []
        if extracted_content['description']:
            recipe_content.append(extracted_content['description'])
        
        # Look for structured data
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    if 'description' in data:
                        recipe_content.append(data['description'])
                    if 'name' in data and 'recipe' in data['name'].lower():
                        recipe_content.append(data['name'])
            except:
                continue
        
        all_content = ' '.join(recipe_content)
        
        return {
            'success': len(all_content) > 50,
            'content': all_content,
            'title': extracted_content['title'],
            'platform': 'youtube',
            'extraction_method': 'page_scraping'
        }
        
    except Exception as e:
        print(f"❌ YouTube content extraction error: {e}")
        return {'success': False, 'error': str(e)}

def extract_reddit_content(url, page_content):
    """Extract recipe content from Reddit posts"""
    print("🤖 Extracting content from Reddit post...")
    
    try:
        soup = BeautifulSoup(page_content, 'html.parser')
        extracted_content = {
            'title': '',
            'post_content': '',
            'comments': []
        }
        
        # Extract post title
        title_selectors = ['h1', '[data-testid="post-content"] h3', '.Post__title']
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem:
                extracted_content['title'] = title_elem.get_text().strip()
                break
        
        # Extract post content
        content_selectors = [
            '[data-testid="post-content"]',
            '.Post__content',
            '.usertext-body',
            '[data-click-id="text"]'
        ]
        
        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                extracted_content['post_content'] = content_elem.get_text().strip()
                break
        
        # Look for recipe-related comments
        comment_selectors = ['.Comment', '.usertext-body', '[data-testid="comment"]']
        for selector in comment_selectors:
            comments = soup.select(selector)
            for comment in comments[:5]:  # Limit to first 5 comments
                comment_text = comment.get_text().strip()
                if any(keyword in comment_text.lower() for keyword in ['recipe', 'ingredient', 'cook', 'bake']):
                    extracted_content['comments'].append(comment_text)
        
        # Combine all content
        all_content = ' '.join([
            extracted_content['title'],
            extracted_content['post_content'],
            ' '.join(extracted_content['comments'][:3])  # Top 3 recipe-related comments
        ])
        
        return {
            'success': len(all_content) > 50,
            'content': all_content,
            'title': extracted_content['title'],
            'platform': 'reddit',
            'extraction_method': 'page_scraping'
        }
        
    except Exception as e:
        print(f"❌ Reddit content extraction error: {e}")
        return {'success': False, 'error': str(e)}

def extract_pinterest_content(url, page_content):
    """Extract recipe content from Pinterest pins"""
    print("📌 Extracting content from Pinterest pin...")
    
    try:
        soup = BeautifulSoup(page_content, 'html.parser')
        extracted_content = {
            'title': '',
            'description': '',
            'linked_recipe': ''
        }
        
        # Extract pin title
        title_tag = soup.find('meta', property='og:title')
        if title_tag:
            extracted_content['title'] = title_tag.get('content', '')
        
        # Extract pin description
        desc_tag = soup.find('meta', property='og:description')
        if desc_tag:
            extracted_content['description'] = desc_tag.get('content', '')
        
        # Look for linked recipe URL
        canonical_tag = soup.find('link', rel='canonical')
        if canonical_tag:
            extracted_content['linked_recipe'] = canonical_tag.get('href', '')
        
        # Combine content
        all_content = ' '.join([
            extracted_content['title'],
            extracted_content['description']
        ])
        
        return {
            'success': len(all_content) > 30,
            'content': all_content,
            'title': extracted_content['title'],
            'linked_recipe': extracted_content['linked_recipe'],
            'platform': 'pinterest',
            'extraction_method': 'page_scraping'
        }
        
    except Exception as e:
        print(f"❌ Pinterest content extraction error: {e}")
        return {'success': False, 'error': str(e)}

def extract_threads_content(url, page_content):
    """Extract recipe content from Threads posts"""
    print("🧵 Extracting content from Threads post...")
    
    try:
        soup = BeautifulSoup(page_content, 'html.parser')
        
        # Extract meta description (Threads puts post content here)
        desc_tag = soup.find('meta', property='og:description')
        if desc_tag:
            content = desc_tag.get('content', '')
        else:
            # Fallback to title
            title_tag = soup.find('meta', property='og:title')
            content = title_tag.get('content', '') if title_tag else ''
        
        return {
            'success': len(content) > 30,
            'content': content,
            'platform': 'threads',
            'extraction_method': 'page_scraping'
        }
        
    except Exception as e:
        print(f"❌ Threads content extraction error: {e}")
        return {'success': False, 'error': str(e)}

def extract_linkedin_content(url, page_content):
    """Extract recipe content from LinkedIn posts"""
    print("💼 Extracting content from LinkedIn post...")
    
    try:
        soup = BeautifulSoup(page_content, 'html.parser')
        
        # Extract post content from meta tags
        desc_tag = soup.find('meta', property='og:description')
        title_tag = soup.find('meta', property='og:title')
        
        content_parts = []
        if title_tag:
            content_parts.append(title_tag.get('content', ''))
        if desc_tag:
            content_parts.append(desc_tag.get('content', ''))
        
        all_content = ' '.join(content_parts)
        
        return {
            'success': len(all_content) > 30,
            'content': all_content,
            'platform': 'linkedin',
            'extraction_method': 'page_scraping'
        }
        
    except Exception as e:
        print(f"❌ LinkedIn content extraction error: {e}")
        return {'success': False, 'error': str(e)}

def extract_generic_content(url, page_content, platform):
    """Generic content extractor with Instagram-specific enhancements"""
    print(f"🌐 Extracting content from {platform} using generic method...")
    
    try:
        soup = BeautifulSoup(page_content, 'html.parser')
        
        content_parts = []
        
        # ENHANCED: Instagram-specific extraction
        if platform == 'instagram':
            print("📸 Using Instagram-specific content extraction...")
            
            # Method 1: Look for JSON-LD structured data
            json_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_scripts:
                try:
                    import json
                    data = json.loads(script.string)
                    if isinstance(data, dict):
                        # Look for post description/caption
                        if 'description' in data:
                            content_parts.append(data['description'])
                        if 'caption' in data:
                            content_parts.append(data['caption'])
                        if 'text' in data:
                            content_parts.append(data['text'])
                except:
                    continue
            
            # Method 2: Look for Instagram-specific meta tags
            ig_meta_tags = [
                'og:description', 'twitter:description', 'description',
                'og:title', 'twitter:title'
            ]
            for meta_name in ig_meta_tags:
                meta_tag = soup.find('meta', attrs={'name': meta_name}) or soup.find('meta', property=meta_name)
                if meta_tag:
                    content = meta_tag.get('content', '')
                    if content and len(content) > 20:  # Skip short meta descriptions
                        content_parts.append(content)
            
            # Method 3: Look for recipe keywords in any text elements
            import re
            recipe_patterns = [
                r'\b\d+\s*(cup|cups|tbsp|tsp|tablespoon|teaspoon|ounce|oz|pound|lb)\b',
                r'\b(ingredient|recipe|cook|bake|mix|add|heat|serve)\b',
                r'\b\d+\s*(minute|minutes|hour|hours)\b'
            ]
            
            # Search all text on page for recipe content
            all_text = soup.get_text()
            recipe_sections = []
            
            for pattern in recipe_patterns:
                matches = re.finditer(pattern, all_text, re.IGNORECASE)
                for match in matches:
                    # Extract surrounding context (200 chars before/after)
                    start = max(0, match.start() - 200)
                    end = min(len(all_text), match.end() + 200)
                    context = all_text[start:end].strip()
                    if len(context) > 50:
                        recipe_sections.append(context)
            
            # Add unique recipe sections
            for section in set(recipe_sections):
                content_parts.append(section)
            
            print(f"📸 Instagram extraction found {len(content_parts)} content sections")
        
        else:
            # Original generic extraction for other platforms
            meta_tags = ['description', 'og:description', 'twitter:description']
            for meta_name in meta_tags:
                meta_tag = soup.find('meta', attrs={'name': meta_name}) or soup.find('meta', property=meta_name)
                if meta_tag:
                    content = meta_tag.get('content', '')
                    if content:
                        content_parts.append(content)
        
        # Extract title
        title_tag = soup.find('title')
        if title_tag:
            content_parts.append(title_tag.get_text())
        
        # Remove duplicates and combine
        unique_content = list(set(content_parts))
        all_content = ' '.join(unique_content)
        
        print(f"🌐 Generic extraction found {len(all_content)} characters of content")
        
        return {
            'success': len(all_content) > 50,
            'content': all_content,
            'platform': platform,
            'extraction_method': 'enhanced_page_scraping',
            'content_sections': len(content_parts)
        }
        
    except Exception as e:
        print(f"❌ {platform} content extraction error: {e}")
        return {'success': False, 'error': str(e)}

# ENHANCED: Universal Content Processor
def process_extracted_content_with_ai(extracted_data, original_url, openai_api_key, user_context=None):
    """Process extracted content with OpenAI to create recipe with user context"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        platform = extracted_data.get('platform', 'unknown')
        content = extracted_data.get('content', '')
        title = extracted_data.get('title', '')
        
        # Get user context for intelligent processing
        user_location = user_context.get('location', 'US') if user_context else 'US'
        measurement_system = user_context.get('measurementSystem', 'imperial') if user_context else 'imperial'
        extract_image = user_context.get('extract_image', False) if user_context else False

        # Use actual user preferences instead of IP detection
        print(f"🌍 User location from signup: {user_location}")
        print(f"📏 User preferred measurements: {measurement_system}")

        # Determine measurement preferences based on user's actual signup data
        if measurement_system == 'metric':
            preferred_system = 'metric'
        elif measurement_system == 'imperial':
            preferred_system = 'imperial'
        else:  # mixed or auto
            # Fall back to location-based detection for mixed/auto users
            metric_countries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AU', 'CA', 'GB', 'IN', 'JP', 'KR', 'CN', 'BR', 'AR', 'MX']
            preferred_system = 'metric' if user_location in metric_countries else 'imperial'
        
        print(f"🤖 Processing {platform} content with AI ({len(content)} characters)...")
        print(f"🌍 User location: {user_location}, Preferred measurements: {preferred_system}")
        
        # Enhanced prompt with user context
        prompt = f"""You are a recipe extraction expert specializing in social media content analysis.

Platform: {platform.upper()}
Source URL: {original_url}
User Location: {user_location}
Preferred Measurements: {preferred_system.upper()}
Content Length: {len(content)} characters

EXTRACTED CONTENT:
{content}

Your task is to analyze this {platform} content and extract or generate a complete recipe optimized for the user's location and preferences.

MEASUREMENT SYSTEM GUIDELINES:
- User Location: {user_location}
- User Preferred System: {preferred_system.upper()}
- For IMPERIAL: Use cups, tbsp, tsp, oz, lbs, °F (Fahrenheit)
- For METRIC: Use ml, l, g, kg, °C (Celsius)
- Be 100% consistent - never mix systems within one recipe
- Use cooking-friendly measurements (1/2 cup, 250ml, not 0.5 cups or 250.0ml)
- This user specifically chose {preferred_system} measurements during signup
- Use cooking-friendly measurements (1/2 cup, 250ml, not decimals)
- Be consistent within the recipe - don't mix systems

IMAGE GENERATION CONTEXT:
- This recipe will need an appetizing food image
- Consider the dish's visual appeal and presentation style
- Think about garnishing and plating for social media

INSTRUCTIONS:
1. If the content contains explicit recipe information, extract it directly
2. If the content mentions food but lacks details, use culinary knowledge to create a complete recipe
3. If content is vague, generate a realistic recipe matching the food item mentioned
4. Adapt measurements to user's preferred system
5. Include image generation details for visual appeal
6. CRITICAL: Structure ingredients properly with separate amount, unit, and name fields
7. Extract nutritional information and generate recipe image prompts
8. CRITICAL: Format instructions as structured objects with separate step numbers
9. Do NOT include "Step 1:", "Step 2:" etc. in the instruction text
10. Include videoTimestamp and videoLink fields for future video integration

INGREDIENT FORMATTING REQUIREMENTS:
- ALWAYS separate amount, unit, and ingredient name into different fields
- Amount: Just the number (e.g., "2", "1", "1/2")
- Unit: Just the unit (e.g., "packets", "jar", "lb", "cups", "tsp")
- Name: Just the ingredient without amount/unit (e.g., "Spanish rice mix", "chunky salsa")
- Examples:
  * "2 packets Spanish rice mix" → {{"name": "Spanish rice mix", "amount": "2", "unit": "packets", "optional": false}}
  * "1 jar chunky salsa" → {{"name": "chunky salsa", "amount": "1", "unit": "jar", "optional": false}}
  * "1 lb ground beef, cooked" → {{"name": "ground beef, cooked", "amount": "1", "unit": "lb", "optional": false}}

INSTRUCTION FORMATTING REQUIREMENTS:
- Structure: {{"text": "instruction content", "step": number, "videoTimestamp": null, "videoLink": null}}
- Do NOT write "Step 1: Preheat oven..." - write "Preheat oven..."
- The step number goes in the separate "step" field
- Keep instruction text clean without step prefixes
- Examples:
  * WRONG: {{"text": "Step 1: Preheat the oven to 375°F", "step": 1}}
  * CORRECT: {{"text": "Preheat the oven to 375°F", "step": 1}}
  * WRONG: {{"text": "Step 2: Mix ingredients together", "step": 2}}  
  * CORRECT: {{"text": "Mix ingredients together", "step": 2}}

Return a complete recipe in this JSON format:
{{
    "title": "Descriptive recipe name",
    "description": "Brief description emphasizing visual appeal and flavor",
    "ingredients": [
    {{"name": "ingredient name", "amount": "1", "unit": "{preferred_system}_unit", "optional": false}}
],
    "instructions": [
        {{"text": "Detailed cooking instruction with visual cues...", "step": 1, "videoTimestamp": null, "videoLink": null}},
        {{"text": "Next step focusing on technique and presentation...", "step": 2, "videoTimestamp": null, "videoLink": null}}
    ],

    "prepTime": "X minutes",
    "cookTime": "X minutes", 
    "servings": "X servings",
    "difficulty": "easy/medium/hard",
    "tags": ["specific-dish", "cooking-method", "cuisine-type", "meal-type"],
    "notes": ["Helpful cooking tips", "Presentation suggestions"],
    "imagePrompt": "Professional food photography description for AI image generation: detailed visual description of the finished dish, plating style, garnishes, lighting, and composition that would look appetizing on {platform}",
    "measurementSystem": "{preferred_system}",
    "userLocation": "{user_location}",
    "source_analysis": {{
        "confidence": 0.85,
        "extraction_type": "direct_extraction/enhanced_generation/creative_interpretation",
        "platform_optimized": true,
        "location_optimized": true
    }}
}}

IMPORTANT: 
- Always return a complete, usable recipe
- Use {preferred_system} measurements consistently 
- Include an imagePrompt for AI image generation
- Make it appetizing and social media worthy
- Consider cultural cooking preferences for the user's location"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2500
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse JSON response
        try:
            json_start = ai_response.find('{')
            json_end = ai_response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = ai_response[json_start:json_end]
                recipe_data = json.loads(json_str)

                # Parse ingredients properly using existing function
                if 'ingredients' in recipe_data and recipe_data['ingredients']:
                    print(f"📝 Parsing {len(recipe_data['ingredients'])} ingredients...")
                    parsed_ingredients = parse_ai_ingredients(recipe_data['ingredients'])
                    recipe_data['ingredients'] = parsed_ingredients
                    print(f"✅ Ingredients parsed and structured")
                
                # Add metadata
                recipe_data.update({
                    "source": original_url,
                    "extraction_method": f"{platform}_page_scraping",
                    "platform": platform,
                    "processed_with": "openai_gpt4o_mini",
                    "user_location": user_location,
                    "measurement_system": preferred_system
                })
                
                # Generate AI image if requested and prompt is available
                if extract_image and recipe_data.get('imagePrompt'):
                    print(f"🎨 Generating AI image using recipe context...")
                    generated_image = generate_smart_recipe_image(recipe_data, openai_api_key)
                    if generated_image:
                        recipe_data['extractedImage'] = {
                            **generated_image,
                            "source": platform,
                            "extractedAt": "ai_generated",
                            "optimized_for": user_location
                        }
                        print(f"✅ AI-generated image added to {platform} recipe")

                        print(f"🥗 Analyzing nutrition for {platform} recipe...")
                try:
                    nutrition_result = analyze_recipe_nutrition_with_ai(recipe_data, openai_api_key)
                    if nutrition_result and nutrition_result.get('success') and nutrition_result.get('nutrition'):
                        recipe_data['nutrition'] = nutrition_result['nutrition']
                        print(f"✅ Nutrition analysis added to {platform} recipe")
                        
                        # Add nutrition-based tags if available
                        nutrition_tags = nutrition_result.get('tags', [])
                        if nutrition_tags:
                            existing_tags = recipe_data.get('tags', [])
                            recipe_data['tags'] = list(set(existing_tags + nutrition_tags))[:10]
                    else:
                        print(f"⚠️ Nutrition analysis failed for {platform} recipe")
                except Exception as nutrition_error:
                    print(f"❌ Nutrition analysis error: {nutrition_error}")
                
                print(f"✅ AI processing successful: '{recipe_data.get('title', 'Unknown Recipe')}'")
                print(f"📏 Using {preferred_system} measurements for {user_location} user")
                return recipe_data
                
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error: {e}")
            
        # Fallback: return basic structure
        return {
            "title": f"{platform.title()} Recipe",
            "description": content[:200] + "..." if len(content) > 200 else content,
            "ingredients": [],
            "instructions": [content],
            "source": original_url,
            "extraction_method": f"{platform}_page_scraping_fallback",
            "platform": platform,
            "user_location": user_location,
            "measurement_system": preferred_system
        }
        
    except Exception as e:
        print(f"❌ AI processing error: {e}")
        return None

def generate_smart_recipe_image(recipe_data, openai_api_key):
    """Generate recipe image using the AI-provided imagePrompt"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        # Use the AI-generated imagePrompt for better context
        image_prompt = recipe_data.get('imagePrompt', '')
        recipe_title = recipe_data.get('title', 'Delicious Recipe')
        
        if not image_prompt:
            # Fallback prompt if none provided
            image_prompt = f"Professional food photography of {recipe_title}, restaurant-quality plating, natural lighting, appetizing presentation"
        
        print(f"🎨 Generating image with AI prompt: {image_prompt[:100]}...")
        
        # Generate image with DALL-E
        response = client.images.generate(
            model="dall-e-3",
            prompt=image_prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        
        image_url = response.data[0].url
        
        # Download and convert to base64
        import requests
        import base64
        
        image_response = requests.get(image_url, timeout=30)
        if image_response.status_code == 200:
            image_b64 = base64.b64encode(image_response.content).decode('utf-8')
            
            return {
                "data": image_b64,
                "extractionMethod": "ai_generated_contextual",
                "prompt": image_prompt,
                "model": "dall-e-3",
                "recipe_title": recipe_title
            }
            
        return None
        
    except Exception as e:
        print(f"❌ Smart image generation failed: {str(e)}")
        return None

# ENHANCED: Universal Recipe Extraction Function
def extract_recipe_from_any_platform(video_url, platform, openai_api_key, extract_image=False, user_context=None):
    """Universal recipe extraction that tries page scraping first, then video download"""
    
    print(f"🌟 UNIVERSAL EXTRACTION: {platform} - {video_url}")
    
    # Step 1: Try page scraping first (faster, more reliable)
    try:
        print(f"📄 Step 1: Attempting page scraping for {platform}...")
        
        page_content, status_code = scrape_page_content(video_url, platform)
        
        if page_content:
            # Route to platform-specific extractor
            extractor_map = {
                'twitter': extract_twitter_content,
                'youtube': extract_youtube_content, 
                'reddit': extract_reddit_content,
                'pinterest': extract_pinterest_content,
                'threads': extract_threads_content,
                'linkedin': extract_linkedin_content,
                'tiktok': lambda url, content: extract_generic_content(url, content, 'tiktok'),
                'instagram': lambda url, content: extract_generic_content(url, content, 'instagram'),
                'facebook': lambda url, content: extract_generic_content(url, content, 'facebook'),
                'bluesky': lambda url, content: extract_generic_content(url, content, 'bluesky'),
                'snapchat': lambda url, content: extract_generic_content(url, content, 'snapchat')
            }
            
            extractor = extractor_map.get(platform, lambda url, content: extract_generic_content(url, content, platform))
            extracted_data = extractor(video_url, page_content)
            
            if extracted_data.get('success'):
                print(f"✅ Page scraping successful for {platform}!")
                
                # Process with AI
                recipe_data = process_extracted_content_with_ai(extracted_data, video_url, openai_api_key, user_context)
                
                if recipe_data:
                    # Add nutrition analysis
                    
                    
                    return {
                        "success": True,
                        "recipe": recipe_data,
                        "extraction_method": "page_scraping_primary",
                        "platform": platform
                    }
            else:
                print(f"⚠️ Page scraping failed for {platform}: {extracted_data.get('error', 'No content found')}")
                
    except Exception as e:
        print(f"❌ Page scraping error for {platform}: {e}")
    
    # Step 2: Fallback to universal video download methods
    print(f"🎥 Step 2: Falling back to video download for {platform}...")
    
    try:
        # Use universal video extraction for all platforms
        return extract_universal_video_content(video_url, openai_api_key, extract_image)
            
    except Exception as e:
        print(f"❌ Video download also failed for {platform}: {e}")
        
        # Step 3: Final fallback - AI URL analysis
        print(f"🤖 Step 3: Final fallback - AI URL analysis for {platform}...")
        return analyze_url_with_ai_fallback(video_url, platform, openai_api_key)

# === NEW IMAGE EXTRACTION FUNCTIONS ===

def extract_facebook_video_content(video_url, openai_api_key, extract_image=False):
    """SAFE: Extract content from Facebook videos with existing functions only"""
    import yt_dlp
    import time
    import os
    
    print(f"🌟 SAFE Facebook extraction starting: {video_url}")
    
    # Strategy 1: Try page scraping first (faster and more reliable)
    print("📄 Step 1: Trying Facebook page scraping...")
    try:
        text_result = extract_facebook_text_content(video_url, openai_api_key)
        if text_result and text_result.get('success'):
            print("✅ Facebook page scraping successful!")
            return text_result
    except Exception as e:
        print(f"⚠️ Page scraping failed: {str(e)}")
    
    # Strategy 2: Enhanced video download with multiple URL variants
    print("🎥 Step 2: Trying enhanced video download...")
    
    # Get all possible URL variants
    url_variants = get_facebook_url_variants(video_url)
    
    # Enhanced download strategies for Facebook
    download_strategies = [
        # Strategy 1: Mobile-optimized
        {
            'format': 'worst[ext=mp4]/worst[ext=webm]/worst',
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.facebook.com/',
            },
            'ignoreerrors': True,
            'no_warnings': True,
            'extract_flat': False,
        },
        # Strategy 2: Desktop user agent
        {
            'format': 'worst[filesize<100M]/worst',
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': 'https://facebook.com',
            },
            'ignoreerrors': True,
            'no_warnings': True,
        }
    ]
    
    temp_video = None
    video_title = "Facebook Recipe Video"
    
    # Try each URL variant with each strategy
    for url_index, test_url in enumerate(url_variants):
        print(f"🔗 Trying URL variant {url_index + 1}/{len(url_variants)}: {test_url}")
        
        for strategy_num, ydl_opts in enumerate(download_strategies, 1):
            try:
                print(f"📋 Using download strategy {strategy_num}...")
                
                temp_video = f"/tmp/facebook_video_{int(time.time())}_{url_index}_{strategy_num}.mp4"
                ydl_opts['outtmpl'] = temp_video
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    # Try to get video info
                    try:
                        info = ydl.extract_info(test_url, download=False)
                        if info:
                            video_title = info.get('title', 'Facebook Recipe Video')
                            print(f"📹 Video info: {video_title}")
                    except Exception:
                        pass  # Continue even if info extraction fails
                    
                    # Attempt download
                    ydl.download([test_url])
                    
                    # Check if file was created and is valid
                    if os.path.exists(temp_video) and os.path.getsize(temp_video) > 1000:
                        print(f"✅ Download successful! File size: {os.path.getsize(temp_video)} bytes")
                        
                        # Process the downloaded video with PROPER frame analysis
                        try:
                            print(f"🎬 Analyzing downloaded video: {video_title}")
                            
                            # Step 1: Extract frames from the video
                            frames = extract_key_frames(temp_video)
                            print(f"📸 Extracted {len(frames)} frames for analysis")
                            
                            if frames:
                                # Step 2: Analyze frames with AI to get the actual recipe
                                print("🤖 Analyzing video frames with AI...")
                                ai_recipe = analyze_frames_with_ai(frames, video_title, openai_api_key)
                                
                                # Step 3: Extract image if requested
                                extracted_image = None
                                if extract_image and frames:
                                    try:
                                        print("🖼️ Extracting recipe image from video...")
                                        # Convert frames to proper format for image extraction
                                        video_frames = extract_video_frames(temp_video, max_frames=15)
                                        if video_frames and ai_recipe:
                                            best_frame = select_best_food_frame(video_frames, ai_recipe, openai_api_key)
                                            if best_frame is not None:
                                                frame_b64 = encode_frame_to_base64(best_frame)
                                                if frame_b64:
                                                    extracted_image = {
                                                        "data": frame_b64,
                                                        "extractionMethod": "video_frame_analysis",
                                                        "frameCount": len(video_frames)
                                                    }
                                                    print("✅ Successfully extracted recipe image")
                                    except Exception as img_error:
                                        print(f"⚠️ Image extraction failed: {img_error}")
                            else:
                                # Fallback to title-based analysis if no frames
                                print("⚠️ No frames extracted, using title-based analysis...")
                                recipe_content = f"Video Title: {video_title}\n\nFacebook recipe video content"
                                ai_recipe = extract_recipe_with_openai(recipe_content, "facebook", openai_api_key)
                            
                            # Clean up temp files
                            try:
                                if os.path.exists(temp_video):
                                    os.remove(temp_video)
                            except:
                                pass
                            
                            if ai_recipe:
                                ai_recipe = post_process_recipe_data(ai_recipe, openai_api_key)
                                
                                result = {
                                    "success": True,
                                    "extraction_method": f"facebook_video_frame_analysis_strategy_{strategy_num}",
                                    "url_variant": test_url,
                                    "video_title": video_title,
                                    "recipe": ai_recipe,  # Now contains parsed data
                                    "source": video_url,
                                    "frames_analyzed": len(frames) if frames else 0
                                }
                                
                                # Add extracted image if available
                                if extracted_image:
                                    result["extracted_image"] = extracted_image
                                    print(f"📸 MODAL DEBUG: Including extracted_image in response: {type(extracted_image)}")
                                    print(f"📸 MODAL DEBUG: Image data length: {len(extracted_image.get('data', ''))}")
                                else:
                                    print(f"📸 MODAL DEBUG: No extracted_image to include")
                                
                                print(f"📸 MODAL DEBUG: Final result keys: {list(result.keys())}")
                                print(f"🚀 RETURNING TO NEXTJS: {type(result)}")
                                print(f"🚀 RETURN KEYS: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                                return result
                        
                        except Exception as processing_error:
                            print(f"⚠️ Video processing failed: {processing_error}")
                            continue
                
                # Clean up failed attempts
                if os.path.exists(temp_video):
                    try:
                        os.remove(temp_video)
                    except:
                        pass
                        
            except Exception as strategy_error:
                print(f"❌ Strategy {strategy_num} failed for {test_url}: {strategy_error}")
                continue
    
    # Strategy 3: Try universal extraction as fallback
    print("🔄 Step 3: Trying universal extraction fallback...")
    try:
        return extract_universal_video_content(video_url, openai_api_key, extract_image)
    except Exception as e:
        print(f"❌ Universal fallback failed: {str(e)}")
    
    # All strategies failed
    return {
        "success": False,
        "error": "Could not download or process video from facebook",
        "attempted_urls": len(url_variants),
        "attempted_strategies": len(download_strategies),
        "suggestion": "Try copying the Facebook post text and using the Text Parser instead",
        "fallback_method": "text_paste",
        "support_note": "Facebook videos may require special permissions or may be private"
    }

def extract_video_frames(video_path: str, max_frames: int = 15) -> List[np.ndarray]:
    """Extract frames from video at regular intervals"""
    
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return []
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        frames = []
        
        # Skip first and last 10% to avoid intro/outro
        start_frame = int(total_frames * 0.1)
        end_frame = int(total_frames * 0.9)
        
        # Calculate frame interval
        frame_interval = max(1, (end_frame - start_frame) // max_frames)
        
        current_frame = start_frame
        while current_frame < end_frame and len(frames) < max_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)
            ret, frame = cap.read()
            
            if ret:
                # Convert BGR to RGB (OpenCV uses BGR)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)
            
            current_frame += frame_interval
        
        cap.release()
        print(f"📸 Extracted {len(frames)} frames")
        return frames
        
    except Exception as e:
        print(f"❌ Frame extraction error: {str(e)}")
        return []
    """Extract frames from video at regular intervals"""
    
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return []
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        frames = []
        
        # Skip first and last 10% to avoid intro/outro
        start_frame = int(total_frames * 0.1)
        end_frame = int(total_frames * 0.9)
        
        # Calculate frame interval
        frame_interval = max(1, (end_frame - start_frame) // max_frames)
        
        current_frame = start_frame
        while current_frame < end_frame and len(frames) < max_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)
            ret, frame = cap.read()
            
            if ret:
                # Convert BGR to RGB (OpenCV uses BGR)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)
            
            current_frame += frame_interval
        
        cap.release()
        print(f"📸 Extracted {len(frames)} frames")
        return frames
        
    except Exception as e:
        print(f"❌ Frame extraction error: {str(e)}")
        return []

def select_best_food_frame(frames: List[np.ndarray], recipe_data: dict, openai_api_key: str) -> np.ndarray:
    """Use AI to select the most appetizing frame"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        # Sample frames for analysis (max 3 to save API costs)
        sample_frames = frames[::max(1, len(frames)//3)][:3]
        
        frame_images = []
        for i, frame in enumerate(sample_frames):
            frame_b64 = encode_frame_to_base64(frame)
            if frame_b64:
                frame_images.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{frame_b64}",
                        "detail": "low"
                    }
                })
        
        recipe_title = recipe_data.get('title', 'Recipe')
        ingredients = recipe_data.get('ingredients', [])
        ingredient_names = [ing.get('name', ing) if isinstance(ing, dict) else str(ing) for ing in ingredients[:3]]
        
        prompt = f"""Analyze these cooking video frames for "{recipe_title}" with ingredients: {', '.join(ingredient_names)}.

Select the frame that shows the most appetizing moment. Consider:
- Food visual appeal and presentation
- Cooking stage (prefer finished dishes or appealing cooking moments)
- Image clarity and quality
- How well it represents the recipe

Respond with just the frame number (1-{len(sample_frames)}) that would make the best recipe photo."""

        content = [{"type": "text", "text": prompt}] + frame_images
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": content}],
            max_tokens=10,
            temperature=0.3
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse frame number
        try:
            selected_frame_num = int(ai_response)
            if 1 <= selected_frame_num <= len(sample_frames):
                original_index = (selected_frame_num - 1) * max(1, len(frames)//3)
                if original_index < len(frames):
                    print(f"🤖 AI selected frame {selected_frame_num}")
                    return frames[original_index]
        except:
            pass
        
        return None
        
    except Exception as e:
        print(f"❌ AI frame selection error: {str(e)}")
        return None

def encode_frame_to_base64(frame: np.ndarray) -> str:
    """Convert frame to base64 JPEG"""
    
    try:
        # Convert to PIL Image
        pil_image = Image.fromarray(frame)
        
        # Resize to reasonable size (max 600px width)
        width, height = pil_image.size
        if width > 600:
            ratio = 600 / width
            new_height = int(height * ratio)
            pil_image = pil_image.resize((600, new_height), Image.Resampling.LANCZOS)

        # Save as JPEG
        buffer = io.BytesIO()
        pil_image.save(buffer, format='JPEG', quality=60, optimize=True)
        
        # Encode to base64
        img_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return img_b64
        
    except Exception as e:
        print(f"❌ Frame encoding error: {str(e)}")
        return ""

def extract_best_frame_from_video(video_path: str, recipe_data: dict, openai_api_key: str) -> dict:
    """Extract the best frame from downloaded video"""
    
    try:
        print("📸 Extracting best frame from video...")
        
        # Extract frames from video
        frames = extract_video_frames(video_path, max_frames=15)
        
        if not frames:
            print("❌ No frames extracted")
            return None
        
        # Use AI to select best frame
        best_frame = select_best_food_frame(frames, recipe_data, openai_api_key)
        
        if best_frame is None:
            # Fallback to middle frame
            best_frame = frames[len(frames) // 2]
            print("⚠️ Using middle frame as fallback")
        
        # Convert to base64
        frame_b64 = encode_frame_to_base64(best_frame)
        
        if frame_b64:
            print("✅ Successfully extracted frame")
            return {
                "data": frame_b64,
                "extractionMethod": "video_frame_analysis",
                "frameCount": len(frames)
            }
        
        return None
        
    except Exception as e:
        print(f"❌ Frame extraction error: {str(e)}")
        return None

def detect_platform_from_url(video_url):
    """Enhanced platform detection for any video URL"""
    url_lower = video_url.lower()
    
    # Existing social media platforms
    if "tiktok.com" in url_lower or "vm.tiktok.com" in url_lower:
        return "tiktok"
    elif "instagram.com" in url_lower:
        return "instagram"
    elif "facebook.com" in url_lower or "fb.watch" in url_lower:
        return "facebook"
    
    # NEW: Additional platforms
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"
    elif "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    elif "reddit.com" in url_lower or "redd.it" in url_lower:
        return "reddit"
    elif "pinterest.com" in url_lower:
        return "pinterest"
    elif "snapchat.com" in url_lower:
        return "snapchat"
    elif "bsky.app" in url_lower or "bluesky.app" in url_lower:
        return "bluesky"
    
    # Check for direct video file URLs
    elif any(ext in url_lower for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']):
        return "direct_video"
    
    # NEW: Generic video platform detection
    elif any(keyword in url_lower for keyword in ['video', 'watch', 'play', 'stream']):
        return "generic_video"
    
    return "unknown"
    
def get_universal_download_strategies(video_url, platform):
    """Get download strategies for any platform"""
    
    base_headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    strategies = []
    
    if platform == "twitter":
        strategies = [
            {
                'format': 'best[ext=mp4]/worst',
                'http_headers': {
                    **base_headers,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
                },
                'extractor_args': {
                    'twitter': {
                        'api': 'legacy'
                    }
                }
            },
            {
                'format': 'worst[filesize<50M]/worst',
                'http_headers': base_headers,
            }
        ]

    elif platform == "tiktok":
        strategies = [
            # Strategy 1: Latest mobile iOS
            {
                'format': 'best[ext=mp4]/best',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.tiktok.com/',
                },
            },
            # Strategy 2: Different mobile format
            {
                'format': 'worst[ext=mp4]/worst',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Accept': '*/*',
                    'Referer': 'https://www.tiktok.com/',
                },
            },
            # Strategy 3: Desktop fallback
            {
                'format': 'worst[filesize<50M]/worst',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': 'https://www.tiktok.com/',
                },
            }
        ]
    elif platform == "youtube":
        strategies = [
            {
                'format': 'best[height<=720][ext=mp4]/worst[ext=mp4]',
                'http_headers': base_headers,
                'extractor_args': {
                    'youtube': {
                        'skip_dash_manifest': True,
                        'player_client': 'web'
                    }
                }
            },
            {
                'format': 'bestaudio/worst',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }]
            }
        ]
    
    elif platform == "reddit":
        strategies = [
            {
                'format': 'best[ext=mp4]/worst',
                'http_headers': base_headers,
            }
        ]
    
    else:
        # Universal strategies for any platform
        strategies = [
            {
                'format': 'worst[ext=mp4]/worst',
                'http_headers': base_headers,
                'ignoreerrors': True,
            },
            {
                'format': 'bestaudio/worst',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }],
                'ignoreerrors': True,
            }
        ]
    
    return strategies
    """Get download strategies for any platform"""
    
    base_headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    strategies = []
    
    if platform == "twitter":
        strategies = [
            # Strategy 1: Mobile Twitter
            {
                'format': 'best[ext=mp4]/worst',
                'http_headers': {
                    **base_headers,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
                },
                'extractor_args': {
                    'twitter': {
                        'api': 'legacy'  # Use legacy API if available
                    }
                }
            },
            # Strategy 2: Generic approach
            {
                'format': 'worst[filesize<50M]/worst',
                'http_headers': base_headers,
            }
        ]

    elif platform == "bluesky":
        strategies = [
            {
                'format': 'best[ext=mp4]/worst',
                'http_headers': {
                    **base_headers,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
                },
                'extractor_args': {
                    'generic': {
                        'force_generic_extractor': True
                    }
                }
            },
            {
                'format': 'worst[filesize<50M]/worst',
                'http_headers': base_headers,
                'ignoreerrors': True,
            }
        ]
    
    elif platform == "youtube":
        strategies = [
            # Strategy 1: YouTube Shorts optimized
            {
                'format': 'best[height<=720][ext=mp4]/worst[ext=mp4]',
                'http_headers': base_headers,
                'extractor_args': {
                    'youtube': {
                        'skip_dash_manifest': True,
                        'player_client': 'web'
                    }
                }
            },
            # Strategy 2: Audio-only fallback
            {
                'format': 'bestaudio/worst',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }]
            }
        ]
    
    elif platform == "reddit":
        strategies = [
            {
                'format': 'best[ext=mp4]/worst',
                'http_headers': base_headers,
            }
        ]
    
    elif platform == "direct_video":
        strategies = [
            {
                'format': 'best',
                'http_headers': base_headers,
            }
        ]
    
    elif platform == "generic_video":
        # Universal strategies for unknown platforms
        strategies = [
            # Strategy 1: Conservative approach
            {
                'format': 'worst[ext=mp4]/worst',
                'http_headers': base_headers,
                'ignoreerrors': True,
            },
            # Strategy 2: Audio extraction
            {
                'format': 'bestaudio/worst',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }],
                'ignoreerrors': True,
            }
        ]
    
    else:
        # Fallback to your existing platform strategies
        return [
        {
            'format': 'worst[ext=mp4]/worst',
            'http_headers': base_headers,
            'ignoreerrors': True,
        },
        {
            'format': 'bestaudio/worst',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }],
            'ignoreerrors': True,
        }
    ]
    
    return strategies

def extract_bluesky_text_content(video_url, openai_api_key):
    """Extract text content from Bluesky posts"""
    print(f"🦋 Extracting text content from Bluesky post: {video_url}")
    
    import requests
    from bs4 import BeautifulSoup
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        response = requests.get(video_url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract text content from Bluesky post
            text_sources = []
            
            # Look for post content (Bluesky has different structure than Twitter)
            post_text = soup.find_all(['div', 'span', 'p'], string=re.compile(r'\b(recipe|ingredient|cook|bake|mix|add|cup|tbsp|tsp|minute|hour)\b', re.IGNORECASE))
            for text_elem in post_text:
                text = text_elem.get_text().strip()
                if len(text) > 20:
                    text_sources.append(text)
            
            # Look for meta tags
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                text_sources.append(meta_desc.get('content', ''))
            
            # Look for Open Graph data
            og_desc = soup.find('meta', property='og:description')
            if og_desc:
                text_sources.append(og_desc.get('content', ''))
            
            extracted_text = ' '.join(text_sources)
            
            if extracted_text and len(extracted_text) > 30:
                print(f"✅ Found Bluesky text content: {len(extracted_text)} characters")
                
                # Process with OpenAI
                from openai import OpenAI
                client = OpenAI(api_key=openai_api_key)
                
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system", 
                            "content": """You are a recipe extraction expert specializing in Bluesky social media content.
                            
                            Bluesky posts often contain recipe information in:
                            - Post text with ingredients and instructions
                            - Replies with additional recipe details
                            - Hashtags indicating cooking methods or dietary info
                            
                            Extract and format as a complete, structured recipe.
                            If information is incomplete, use culinary knowledge to fill reasonable gaps.
                            """
                        },
                        {
                            "role": "user", 
                            "content": f"Extract recipe from this Bluesky post content:\n\n{extracted_text}"
                        }
                    ],
                    temperature=0.3,
                    max_tokens=2000
                )
                
                recipe_text = response.choices[0].message.content
                
                return {
                    "success": True,
                    "extraction_method": "bluesky_text_extraction",
                    "source_text_length": len(extracted_text),
                    "recipe": {
                        "title": "Bluesky Recipe",
                        "source": video_url,
                        "extraction_note": "Extracted from Bluesky post text content"
                    }
                }
            
            else:
                return {
                    "success": False,
                    "error": "Bluesky post access failed. The post may be private, deleted, or not contain recipe information.",
                    "suggestion": "Try copying the post text manually and use the Text Parser instead.",
                    "fallback_method": "text_paste"
                }
        
        else:
            return {
                "success": False,
                "error": f"Could not access Bluesky post (HTTP {response.status_code})",
                "suggestion": "The post may be private or deleted. Try copying the text and use Text Parser.",
                "fallback_method": "text_paste"
            }
            
    except Exception as e:
        print(f"❌ Bluesky text extraction failed: {str(e)}")
        return {
            "success": False,
            "error": f"Bluesky text extraction failed: {str(e)}",
            "fallback_method": "text_paste"
        }

def extract_universal_video_content(video_url, openai_api_key):
    """Universal video content extraction with intelligent fallbacks"""
    import yt_dlp
    import time
    import os
    
    platform = detect_platform_from_url(video_url)
    print(f"🌍 Universal video extraction for {platform}: {video_url}")
    
    # NEW: Pre-flight content analysis
    if platform in ["twitter", "youtube", "reddit"]:
        # These platforms might have recipe indicators in metadata
        content_hints = analyze_url_for_recipe_indicators(video_url)
        if not content_hints.get('likely_contains_recipe', True):
            print(f"⚠️ URL doesn't appear to contain recipe content: {content_hints.get('reason', 'Unknown')}")
            # Still proceed, but set lower confidence
    
    try:
        strategies = get_universal_download_strategies(video_url, platform)
        temp_video = None
        video_title = f"{platform.title()} Recipe Video"
        
        for strategy_num, ydl_opts in enumerate(strategies, 1):
            try:
                print(f"🔄 Trying universal strategy {strategy_num} for {platform}...")
                
                ydl_opts.update({
                    'quiet': True,
                    'no_warnings': True,
                    'ignoreerrors': True,
                })
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    # Get video info first
                    try:
                        info = ydl.extract_info(video_url, download=False)
                        video_title = info.get('title', f'{platform.title()} Recipe Video')
                        
                        # NEW: Enhanced recipe content detection
                        description = info.get('description', '').lower()
                        if any(keyword in description for keyword in ['recipe', 'ingredient', 'cook', 'bake', 'food']):
                            print(f"✅ Recipe keywords found in {platform} video description")
                        
                    except Exception as info_error:
                        print(f"⚠️ Could not extract {platform} video info: {info_error}")
                    
                    # Try to download
                    temp_video = f"/tmp/{platform}_video_{int(time.time())}.mp4"
                    ydl_opts['outtmpl'] = temp_video
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl_download:
                        ydl_download.download([video_url])
                    
                    # Check if file exists and is valid
                    if os.path.exists(temp_video) and os.path.getsize(temp_video) > 1000:
                        print(f"✅ Universal strategy {strategy_num} successful for {platform}!")
                        break
                        
            except Exception as e:
                print(f"❌ Universal strategy {strategy_num} failed for {platform}: {str(e)}")
                if temp_video and os.path.exists(temp_video):
                    os.remove(temp_video)
                temp_video = None
                continue
        
        # If download worked, analyze with your existing AI
        if temp_video and os.path.exists(temp_video):
            frames = extract_key_frames(temp_video)
            print(f"📸 Extracted {len(frames)} frames from {platform} video")
            
            if frames:
                recipe_data = analyze_frames_with_ai(frames, video_title, openai_api_key)
                
                # Cleanup
                if os.path.exists(temp_video):
                    os.remove(temp_video)
                
                return recipe_data
        
        # NEW: Fallback to text/metadata extraction for platforms that block downloads
        print(f"🔄 Video download failed for {platform}, trying text extraction...")
        return extract_platform_text_content(video_url, platform, openai_api_key)
        
    except Exception as e:
        print(f"❌ Universal video extraction error for {platform}: {str(e)}")
        return None

def analyze_url_for_recipe_indicators(video_url):
    """Analyze URL and metadata for recipe content indicators"""
    import requests
    from bs4 import BeautifulSoup
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        }
        
        response = requests.get(video_url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for recipe indicators in page content
        page_text = soup.get_text().lower()
        recipe_keywords = ['recipe', 'ingredient', 'cook', 'bake', 'food', 'kitchen', 'chef', 'cooking']
        
        keyword_count = sum(1 for keyword in recipe_keywords if keyword in page_text)
        
        # Check meta tags
        title = soup.find('meta', property='og:title')
        description = soup.find('meta', property='og:description')
        
        meta_text = ''
        if title:
            meta_text += title.get('content', '').lower()
        if description:
            meta_text += ' ' + description.get('content', '').lower()
        
        meta_keyword_count = sum(1 for keyword in recipe_keywords if keyword in meta_text)
        
        likely_contains_recipe = (keyword_count >= 2 or meta_keyword_count >= 1)
        
        return {
            'likely_contains_recipe': likely_contains_recipe,
            'keyword_count': keyword_count,
            'meta_keyword_count': meta_keyword_count,
            'reason': 'Insufficient recipe keywords found' if not likely_contains_recipe else 'Recipe indicators found'
        }
        
    except Exception as e:
        print(f"⚠️ Could not analyze URL for recipe indicators: {e}")
        return {'likely_contains_recipe': True, 'reason': 'Analysis failed, proceeding anyway'}

def extract_platform_text_content(video_url, platform, openai_api_key):
    """Extract text content when video download fails"""
    if platform == "twitter":
        return extract_twitter_text_content(video_url, openai_api_key)
    elif platform == "youtube":
        return extract_youtube_text_content(video_url, openai_api_key)
    elif platform == "reddit":
        return extract_reddit_text_content(video_url, openai_api_key)
    elif platform == "bluesky":  # ADD THIS LINE
        return extract_bluesky_text_content(video_url, openai_api_key)
    else:
        return extract_generic_text_content(video_url, openai_api_key)

def extract_youtube_text_content(video_url, openai_api_key):
    """Extract text content from YouTube videos when download fails"""
    print(f"📺 Extracting text content from YouTube video: {video_url}")
    
    import requests
    from bs4 import BeautifulSoup
    import re
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        response = requests.get(video_url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract YouTube video description and title
            text_sources = []
            
            # Look for video title
            title_tag = soup.find('meta', property='og:title')
            if title_tag:
                title = title_tag.get('content', '')
                if any(keyword in title.lower() for keyword in ['recipe', 'cook', 'bake', 'food']):
                    text_sources.append(title)
            
            # Look for video description
            desc_tag = soup.find('meta', property='og:description')
            if desc_tag:
                description = desc_tag.get('content', '')
                if len(description) > 50:
                    text_sources.append(description)
            
            # Look for recipe-related content in page
            recipe_content = soup.find_all(['div', 'span', 'p'], string=re.compile(r'\b(recipe|ingredient|cook|bake|mix|add|cup|tbsp|tsp)\b', re.IGNORECASE))
            for content in recipe_content[:3]:  # Limit to avoid too much content
                text = content.get_text().strip()
                if len(text) > 30:
                    text_sources.append(text)
            
            extracted_text = ' '.join(text_sources)
            
            if extracted_text and len(extracted_text) > 50:
                print(f"✅ Found YouTube text content: {len(extracted_text)} characters")
                return process_extracted_text_with_ai(extracted_text, "YouTube", video_url, openai_api_key)
            else:
                return {
                    "success": False,
                    "error": "YouTube video processing failed. This may be due to content restrictions, age restrictions, or the video may not contain recipe information.",
                    "suggestion": "Try copying recipe information from the video description or comments and use Text Parser instead.",
                    "fallback_method": "text_paste"
                }
        else:
            return {
                "success": False,
                "error": f"Could not access YouTube video (HTTP {response.status_code})",
                "suggestion": "The video may be private, age-restricted, or deleted. Try copying the description text and use Text Parser.",
                "fallback_method": "text_paste"
            }
            
    except Exception as e:
        print(f"❌ YouTube text extraction failed: {str(e)}")
        return {
            "success": False,
            "error": f"YouTube text extraction failed: {str(e)}",
            "suggestion": "Try copying the video description and use Text Parser instead.",
            "fallback_method": "text_paste"
        }

def extract_reddit_text_content(video_url, openai_api_key):
    """Extract text content from Reddit posts when download fails"""
    print(f"🤖 Extracting text content from Reddit post: {video_url}")
    
    import requests
    from bs4 import BeautifulSoup
    import re
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        response = requests.get(video_url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract Reddit post content
            text_sources = []
            
            # Look for post title
            title_tag = soup.find('meta', property='og:title')
            if title_tag:
                title = title_tag.get('content', '')
                if any(keyword in title.lower() for keyword in ['recipe', 'cook', 'bake', 'food']):
                    text_sources.append(title)
            
            # Look for post description/content
            desc_tag = soup.find('meta', property='og:description')
            if desc_tag:
                description = desc_tag.get('content', '')
                if len(description) > 30:
                    text_sources.append(description)
            
            # Look for recipe-related content in comments or post body
            recipe_content = soup.find_all(['div', 'span', 'p'], string=re.compile(r'\b(recipe|ingredient|cook|bake|mix|add|cup|tbsp|tsp)\b', re.IGNORECASE))
            for content in recipe_content[:5]:  # Get more content from Reddit
                text = content.get_text().strip()
                if len(text) > 30:
                    text_sources.append(text)
            
            extracted_text = ' '.join(text_sources)
            
            if extracted_text and len(extracted_text) > 50:
                print(f"✅ Found Reddit text content: {len(extracted_text)} characters")
                return process_extracted_text_with_ai(extracted_text, "Reddit", video_url, openai_api_key)
            else:
                return {
                    "success": False,
                    "error": "Reddit post access failed. The post may be in a private community, deleted, or not contain recipe information.",
                    "suggestion": "Try copying recipe text from the Reddit post or comments and use Text Parser instead.",
                    "fallback_method": "text_paste"
                }
        else:
            return {
                "success": False,
                "error": f"Could not access Reddit post (HTTP {response.status_code})",
                "suggestion": "The post may be private, deleted, or in a restricted community. Try copying text and use Text Parser.",
                "fallback_method": "text_paste"
            }
            
    except Exception as e:
        print(f"❌ Reddit text extraction failed: {str(e)}")
        return {
            "success": False,
            "error": f"Reddit text extraction failed: {str(e)}",
            "suggestion": "Try copying recipe text from the Reddit post and use Text Parser instead.",
            "fallback_method": "text_paste"
        }

def extract_generic_text_content(video_url, openai_api_key):
    """Extract text content from generic video platforms when download fails"""
    print(f"🎥 Extracting text content from generic video platform: {video_url}")
    
    import requests
    from bs4 import BeautifulSoup
    import re
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        response = requests.get(video_url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract generic video content
            text_sources = []
            
            # Look for page title
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text()
                if any(keyword in title.lower() for keyword in ['recipe', 'cook', 'bake', 'food']):
                    text_sources.append(title)
            
            # Look for meta descriptions
            meta_tags = ['description', 'og:description', 'twitter:description']
            for meta_name in meta_tags:
                meta_tag = soup.find('meta', attrs={'name': meta_name}) or soup.find('meta', property=meta_name)
                if meta_tag:
                    content = meta_tag.get('content', '')
                    if len(content) > 30:
                        text_sources.append(content)
            
            # Look for recipe-related content on the page
            recipe_content = soup.find_all(['div', 'span', 'p', 'h1', 'h2'], string=re.compile(r'\b(recipe|ingredient|cook|bake|mix|add|cup|tbsp|tsp)\b', re.IGNORECASE))
            for content in recipe_content[:3]:
                text = content.get_text().strip()
                if len(text) > 30:
                    text_sources.append(text)
            
            extracted_text = ' '.join(text_sources)
            
            if extracted_text and len(extracted_text) > 50:
                print(f"✅ Found generic platform text content: {len(extracted_text)} characters")
                return process_extracted_text_with_ai(extracted_text, "Generic Video Platform", video_url, openai_api_key)
            else:
                return {
                    "success": False,
                    "error": "Video platform not fully supported yet, or no recipe content found.",
                    "suggestion": "Copy any recipe text from the page and use the Text Parser for best results.",
                    "fallback_method": "text_paste"
                }
        else:
            return {
                "success": False,
                "error": f"Could not access video platform (HTTP {response.status_code})",
                "suggestion": "The content may be restricted or unavailable. Try copying text and use Text Parser.",
                "fallback_method": "text_paste"
            }
            
    except Exception as e:
        print(f"❌ Generic text extraction failed: {str(e)}")
        return {
            "success": False,
            "error": f"Generic text extraction failed: {str(e)}",
            "suggestion": "Copy any recipe text from the page and use Text Parser instead.",
            "fallback_method": "text_paste"
        }

def process_extracted_text_with_ai(extracted_text, platform_name, video_url, openai_api_key):
    """Process extracted text with OpenAI to create recipe"""
    from openai import OpenAI
    
    try:
        client = OpenAI(api_key=openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": f"""You are a recipe extraction expert specializing in {platform_name} content.
                    
                    Extract and format as a complete, structured recipe with:
                    - Clear title
                    - Ingredient list with measurements
                    - Step-by-step instructions
                    - Cooking times and servings if mentioned
                    
                    If information is incomplete, use culinary knowledge to fill reasonable gaps.
                    Return a complete JSON recipe object.
                    """
                },
                {
                    "role": "user", 
                    "content": f"Extract recipe from this {platform_name} content:\n\n{extracted_text}"
                }
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        recipe_text = response.choices[0].message.content
        
        # Try to parse as JSON, fallback to text processing
        try:
            import json
            json_start = recipe_text.find('{')
            json_end = recipe_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = recipe_text[json_start:json_end]
                recipe_data = json.loads(json_str)
                
                return {
                    "success": True,
                    "extraction_method": f"{platform_name.lower()}_text_extraction",
                    "source_text_length": len(extracted_text),
                    "recipe": {
                        **recipe_data,
                        "source": video_url,
                        "extraction_note": f"Extracted from {platform_name} text content"
                    }
                }
        except:
            pass
        
        # Fallback: return basic recipe structure
        return {
            "success": True,
            "extraction_method": f"{platform_name.lower()}_text_extraction",
            "source_text_length": len(extracted_text),
            "recipe": {
                "title": f"{platform_name} Recipe",
                "description": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
                "ingredients": [],
                "instructions": [extracted_text],
                "source": video_url,
                "extraction_note": f"Extracted from {platform_name} text content"
            }
        }
        
    except Exception as e:
        print(f"❌ AI text processing failed: {str(e)}")
        return {
            "success": False,
            "error": f"{platform_name} text processing failed: {str(e)}",
            "fallback_method": "text_paste"
        }

def extract_twitter_text_content(video_url, openai_api_key):
    """Extract text content from Twitter/X posts"""
    # Similar to your Facebook extraction but for Twitter
    print(f"🐦 Extracting text content from Twitter/X post: {video_url}")
    
    # Implementation similar to extract_facebook_text_content
    # but adapted for Twitter's structure
    
    return {
        "success": False,
        "error": "Twitter text extraction not yet implemented",
        "suggestion": "Try copying the tweet text and use the Text Parser instead",
        "fallback_method": "text_paste"
    }

def get_facebook_url_variants(video_url):
    """Generate Facebook URL variants to try - ENHANCED FOR /share/v/ FORMAT"""
    import re
    
    variants = [video_url]  # Always try original first
    
    # Convert to mobile version
    if 'www.facebook.com' in video_url:
        variants.append(video_url.replace('www.facebook.com', 'm.facebook.com'))
    elif 'facebook.com' in video_url and 'm.facebook.com' not in video_url:
        variants.append(video_url.replace('facebook.com', 'm.facebook.com'))
    
    # Try different path formats
    base_variants = []
    for url in variants:
        base_variants.append(url)
        
        # 🚀 NEW: Convert share/v/ to watch format (MISSING FORMAT!)
        if '/share/v/' in url:
            # Extract ID and convert to watch format
            match = re.search(r'/share/v/([^/?]+)', url)
            if match:
                share_id = match.group(1)
                base_url = url.split('/share/v/')[0]
                base_variants.extend([
                    f"{base_url}/watch/?v={share_id}",
                    f"{base_url}/reel/{share_id}",
                    f"{base_url}/videos/{share_id}",
                    f"https://m.facebook.com/watch/?v={share_id}",
                    f"https://www.facebook.com/watch/?v={share_id}"
                ])
        
        # Convert share/r/ to watch format  
        elif '/share/r/' in url:
            # Extract ID and convert to watch format
            match = re.search(r'/share/r/([^/?]+)', url)
            if match:
                share_id = match.group(1)
                base_url = url.split('/share/r/')[0]
                base_variants.extend([
                    f"{base_url}/watch/?v={share_id}",
                    f"{base_url}/reel/{share_id}",
                    f"https://m.facebook.com/watch/?v={share_id}"
                ])
        
        # Convert reel/ to watch format  
        elif '/reel/' in url:
            match = re.search(r'/reel/([^/?]+)', url)
            if match:
                reel_id = match.group(1)
                base_url = url.split('/reel/')[0]
                base_variants.extend([
                    f"{base_url}/watch/?v={reel_id}",
                    f"https://m.facebook.com/watch/?v={reel_id}"
                ])
        
        # 🚀 NEW: Try to extract any video ID pattern and create variants
        video_id_patterns = [
            r'/videos?/(\d+)',
            r'[?&]v=([^&]+)',
            r'/watch[/?].*?[?&]v=([^&]+)'
        ]
        
        for pattern in video_id_patterns:
            match = re.search(pattern, url)
            if match:
                video_id = match.group(1)
                base_variants.extend([
                    f"https://www.facebook.com/watch/?v={video_id}",
                    f"https://m.facebook.com/watch/?v={video_id}",
                    f"https://facebook.com/reel/{video_id}"
                ])
    
    # Remove duplicates while preserving order
    unique_variants = list(dict.fromkeys(base_variants))
    
    print(f"🔄 Generated {len(unique_variants)} Facebook URL variants to try:")
    for i, variant in enumerate(unique_variants[:5], 1):  # Show first 5
        print(f"   {i}. {variant}")
    if len(unique_variants) > 5:
        print(f"   ... and {len(unique_variants) - 5} more")
    
    return unique_variants

def extract_facebook_text_content(video_url, openai_api_key):
    """
    SAFE: Extract text content from Facebook videos using existing functions only
    """
    import requests
    from bs4 import BeautifulSoup
    import re
    import time

    print(f"📄 SAFE Facebook text extraction: {video_url}")
    
    # Multiple user agents to try
    user_agents = [
        # Mobile iOS (often gets simpler HTML)
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
        # Mobile Android
        'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
        # Desktop Chrome
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ]
    
    # Get URL variants to try (use existing function)
    url_variants = get_facebook_url_variants(video_url)
    
    for url_index, test_url in enumerate(url_variants):
        print(f"🌐 Trying URL {url_index + 1}/{len(url_variants)}: {test_url}")
        
        for ua_index, user_agent in enumerate(user_agents):
            try:
                headers = {
                    'User-Agent': user_agent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0',
                    'Referer': 'https://www.facebook.com/' if 'facebook.com' in test_url else None
                }
                
                print(f"📱 Using user agent {ua_index + 1}: {'Mobile' if 'iPhone' in user_agent or 'Android' in user_agent else 'Desktop'}")
                
                session = requests.Session()
                response = session.get(test_url, headers=headers, timeout=20, allow_redirects=True)
                
                print(f"📊 Response: {response.status_code} | Size: {len(response.content)} bytes")
                
                if response.status_code == 200 and len(response.content) > 5000:  # Must be substantial content
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Enhanced text extraction methods
                    extracted_texts = []
                    
                    # Method 1: Look for video descriptions in meta tags
                    meta_description = soup.find('meta', property='og:description')
                    if meta_description and meta_description.get('content'):
                        desc_text = meta_description.get('content').strip()
                        if len(desc_text) > 20:
                            extracted_texts.append(f"Video Description: {desc_text}")
                            print(f"✅ Found meta description: {desc_text[:100]}...")
                    
                    # Method 2: Look for video title
                    meta_title = soup.find('meta', property='og:title')
                    if meta_title and meta_title.get('content'):
                        title_text = meta_title.get('content').strip()
                        extracted_texts.append(f"Video Title: {title_text}")
                        print(f"✅ Found meta title: {title_text}")
                    
                    # Method 3: Search for recipe-related content in text nodes
                    recipe_keywords = [
                        'recipe', 'ingredient', 'cook', 'bake', 'mix', 'add', 'cup', 'cups',
                        'tbsp', 'tablespoon', 'tsp', 'teaspoon', 'minute', 'minutes', 'hour',
                        'oven', 'pan', 'heat', 'oil', 'salt', 'pepper', 'onion', 'garlic',
                        'flour', 'sugar', 'butter', 'egg', 'milk', 'water', 'serve', 'dish'
                    ]
                    
                    # Find text containing recipe keywords
                    all_text_elements = soup.find_all(text=True)
                    for text_element in all_text_elements:
                        text = text_element.strip()
                        if len(text) > 30:  # Only substantial text
                            text_lower = text.lower()
                            keyword_count = sum(1 for keyword in recipe_keywords if keyword in text_lower)
                            
                            if keyword_count >= 2:  # Must have at least 2 recipe keywords
                                extracted_texts.append(text)
                                print(f"✅ Found recipe-related text ({keyword_count} keywords): {text[:80]}...")
                    
                    # Combine all extracted text
                    combined_text = '\n\n'.join(set(extracted_texts))  # Remove duplicates
                    
                    print(f"📝 Total extracted text: {len(combined_text)} characters")
                    
                    if len(combined_text) > 50:  # Must have substantial content
                        # Generate recipe using EXISTING function
                        try:
                            # Use existing process_extracted_text_with_ai function
                            result = process_extracted_text_with_ai(combined_text, "Facebook", video_url, openai_api_key)
                            
                            if result:
                                return {
                                    "success": True,
                                    "extraction_method": f"facebook_page_scraping_ua_{ua_index + 1}",
                                    "source_url": test_url,
                                    "source_text_length": len(combined_text),
                                    "recipe": result,
                                    "raw_content": combined_text,
                                    "source": video_url
                                }
                        
                        except Exception as ai_error:
                            print(f"⚠️ AI processing failed: {ai_error}")
                            # Return raw content even if AI fails
                            return {
                                "success": True,
                                "extraction_method": f"facebook_page_scraping_raw_ua_{ua_index + 1}",
                                "source_url": test_url,
                                "raw_content": combined_text,
                                "note": "Raw content extracted, AI processing failed",
                                "source": video_url
                            }
                
                # Small delay between requests
                time.sleep(1)
                
            except Exception as request_error:
                print(f"❌ Request failed for UA {ua_index + 1}: {request_error}")
                continue
    
    # All attempts failed
    return {
        "success": False,
        "error": "Could not extract text content from Facebook page",
        "attempted_urls": len(url_variants),
        "attempted_user_agents": len(user_agents),
        "suggestion": "Try copying the Facebook post text manually and using the Text Parser instead",
        "fallback_method": "text_paste"
    }
    
def ai_video_frame_analysis(video_url, openai_api_key):
    """Analyze video frames using AI to extract recipe information"""
    import yt_dlp
    import time
    import os
    
    print(f"🤖 Starting AI video frame analysis for: {video_url}")
    
    try:
        # Try multiple Facebook-specific download strategies
        download_strategies = [
            # Strategy 1: Mobile format
            {
                'format': 'worst[ext=mp4]/worst',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                }
            },
            # Strategy 2: Any available format
            {
                'format': 'best[filesize<50M]/worst',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                }
            },
            # Strategy 3: Audio only (for transcript)
            {
                'format': 'bestaudio/worst',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }]
            }
        ]
        
        temp_video = None
        video_title = "Facebook Recipe Video"
        
        for strategy_num, ydl_opts in enumerate(download_strategies, 1):
            try:
                print(f"🔄 Trying download strategy {strategy_num}...")
                
                ydl_opts.update({
                    'quiet': True,
                    'no_warnings': True,
                    'ignoreerrors': True,
                })
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    # Get video info first
                    info = ydl.extract_info(video_url, download=False)
                    video_title = info.get('title', 'Facebook Recipe Video')
                    
                    # ADD: Debug what we should expect (MOVED HERE where ydl exists)
                    # debug_video_content(video_title)
                    
                    # Try to download
                    temp_video = f"/tmp/facebook_video_{int(time.time())}.mp4"
                    ydl_opts['outtmpl'] = temp_video
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl_download:
                        ydl_download.download([video_url])
                    
                    # Check if file exists
                    if os.path.exists(temp_video) and os.path.getsize(temp_video) > 1000:  # At least 1KB
                        print(f"✅ Strategy {strategy_num} successful! Downloaded: {video_title}")
                        break
                        
            except Exception as e:
                print(f"❌ Strategy {strategy_num} failed: {str(e)}")
                if temp_video and os.path.exists(temp_video):
                    os.remove(temp_video)
                temp_video = None
                continue
        
        # If no download worked, try screenshot approach
        if not temp_video or not os.path.exists(temp_video):
            print("🔄 Video download failed, trying screenshot analysis...")
            return analyze_facebook_url_with_ai(video_url, video_title, openai_api_key)
        
        # Extract frames for analysis
        frames = extract_key_frames(temp_video)
        print(f"📸 Extracted {len(frames)} frames for analysis")
        
        if not frames:
            print("❌ No frames extracted, falling back to URL analysis")
            return analyze_facebook_url_with_ai(video_url, video_title, openai_api_key)
        
        # Analyze frames with OpenAI
        recipe_data = analyze_frames_with_ai(frames, video_title, openai_api_key)
        
        # Cleanup
        if temp_video and os.path.exists(temp_video):
            os.remove(temp_video)
        
        return recipe_data
        
    except Exception as e:
        print(f"❌ AI video analysis error: {str(e)}")
        return None
    
def analyze_tiktok_url_with_ai(video_url, openai_api_key):
    """
    Analyze TikTok URL when audio/visual analysis fails
    Generate a realistic recipe based on TikTok trends
    """
    print(f"🤖 Analyzing TikTok URL with AI: {video_url}")
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user", 
                "content": f"""I have a TikTok video URL that I cannot process due to no detectable audio or unclear visuals: {video_url}

Based on current TikTok food trends and viral recipe patterns, generate a realistic recipe that might be featured in such a video. Consider:
- Popular TikTok recipe formats (quick, trendy, visually appealing)
- Viral TikTok food trends (pasta recipes, desserts, quick hacks)
- Common ingredients featured in cooking TikToks
- Short, snappy instructions typical of TikTok format

Create a complete recipe in JSON format:
{{
    "title": "Viral TikTok-style recipe name",
    "description": "Description emphasizing visual appeal and trendiness",
    "prep_time": "5-15 minutes (TikTok-appropriate)",
    "cook_time": "10-20 minutes",
    "servings": "1-4",
    "ingredients": ["ingredient list with TikTok-style measurements"],
    "instructions": ["Quick, visual step-by-step instructions"],
    "tags": ["tiktok-viral", "quick", "trendy", "visual"],
    "notes": ["TikTok-style tips and hacks"]
}}"""
            }],
            temperature=0.7,
            max_tokens=1500
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            recipe_data = json.loads(json_str)
            return recipe_data
        
        return None
        
    except Exception as e:
        print(f"❌ TikTok URL analysis error: {str(e)}")
        return None

def extract_instagram_text_content(video_url, openai_api_key):
    """
    Extract text content from Instagram videos when yt-dlp fails
    Similar to Facebook text extraction but for Instagram
    """
    import requests
    from bs4 import BeautifulSoup
    import re
    
    print(f"🔍 Extracting text content from Instagram video: {video_url}")
    
    # Instagram-specific headers
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    try:
        # Try different Instagram URL formats
        urls_to_try = [
            video_url,
            video_url.replace('instagram.com', 'm.instagram.com'),
            video_url + '?__a=1',  # Instagram API format
        ]
        
        extracted_text = ""
        
        for url in urls_to_try:
            try:
                print(f"🌐 Trying Instagram URL: {url}")
                response = requests.get(url, headers=headers, timeout=15)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Extract Instagram-specific content
                    text_sources = []
                    
                    # Method 1: Look for video caption/description
                    captions = soup.find_all(['div', 'span'], string=re.compile(r'\b(recipe|ingredient|cook|bake|mix|add|cup|tbsp|tsp)\b', re.IGNORECASE))
                    for caption in captions:
                        text = caption.get_text().strip()
                        if len(text) > 20:
                            text_sources.append(text)
                    
                    # Method 2: Look for structured data in script tags
                    script_tags = soup.find_all('script', type='application/ld+json')
                    for script in script_tags:
                        try:
                            import json
                            data = json.loads(script.string)
                            if 'description' in data:
                                text_sources.append(data['description'])
                        except:
                            continue
                    
                    # Method 3: Instagram-specific meta tags
                    meta_desc = soup.find('meta', attrs={'property': 'og:description'})
                    if meta_desc:
                        text_sources.append(meta_desc.get('content', ''))
                    
                    # Combine text sources
                    extracted_text = ' '.join(text_sources)
                    
                    if extracted_text and len(extracted_text) > 30:
                        print(f"✅ Found Instagram text content: {len(extracted_text)} characters")
                        break
                        
            except Exception as e:
                print(f"❌ Failed to extract from {url}: {str(e)}")
                continue
        
        if not extracted_text or len(extracted_text) < 30:
            return {
                "success": False,
                "error": "Instagram video access failed. This usually happens when the Reel is private, requires login, or Instagram is blocking automated access.",
                "suggestion": "Try these solutions:\n• Make sure the Reel is completely public\n• Use 'Share' → 'Copy Link' from Instagram mobile app\n• Wait a few minutes (Instagram may be rate limiting)\n• Copy recipe text manually and use Text Parser instead",
                "fallback_method": "text_paste"
            }
        
        # Process extracted text with OpenAI
        print(f"🧠 Processing Instagram text with OpenAI...")
        
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": """You are a recipe extraction expert specializing in Instagram content.
                    
                    Instagram Reels often contain recipe information in:
                    - Video captions and descriptions
                    - Text overlays shown during the video
                    - Hashtags that indicate ingredients or techniques
                    - Comments with additional recipe details
                    
                    Extract and format as a complete, structured recipe.
                    If information is incomplete, use culinary knowledge to fill reasonable gaps.
                    """
                },
                {
                    "role": "user", 
                    "content": f"Extract recipe from this Instagram Reel content:\n\n{extracted_text}"
                }
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        recipe_text = response.choices[0].message.content
        
        # Parse AI response into structured format
        # (You can reuse your existing parsing logic here)
        
        return {
            "success": True,
            "extraction_method": "instagram_text_extraction",
            "source_text_length": len(extracted_text),
            "recipe": {
                "title": "Instagram Recipe",  # Will be improved by AI parsing
                "source": video_url,
                "extraction_note": "Extracted from Instagram Reel text content"
            }
        }
        
    except Exception as e:
        print(f"❌ Instagram text extraction failed: {str(e)}")
        return {
            "success": False,
            "error": f"Instagram text extraction failed: {str(e)}",
            "fallback_method": "text_paste"
        }

def analyze_instagram_url_with_ai(video_url, openai_api_key):
    """
    Analyze Instagram URL when all other methods fail
    Generate a realistic recipe based on URL patterns and trends
    """
    print(f"🤖 Analyzing Instagram URL with AI: {video_url}")
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        # Extract potential clues from URL and generate realistic recipe
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user", 
                "content": f"""I have an Instagram Reel URL that I cannot access due to privacy/rate limiting: {video_url}

Based on current Instagram food trends and common recipe patterns, generate a realistic recipe that might be featured in such a Reel. Consider:
- Popular Instagram recipe formats (quick, visual, trendy)
- Common ingredients and techniques featured on Instagram
- Typical social media recipe presentation style

Create a complete recipe in JSON format:
{{
    "title": "Trendy Instagram-style recipe name",
    "description": "Description focusing on visual appeal",
    "prep_time": "X minutes",
    "cook_time": "X minutes", 
    "servings": "X",
    "ingredients": ["ingredient list with measurements"],
    "instructions": ["step by step instructions"],
    "tags": ["instagram-trending", "quick", "visual"],
    "notes": ["Tips for Instagram-worthy presentation"]
}}"""
            }],
            temperature=0.7,
            max_tokens=1500
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            recipe_data = json.loads(json_str)
            return recipe_data
        
        return None
        
    except Exception as e:
        print(f"❌ Instagram URL analysis error: {str(e)}")
        return None

def analyze_facebook_url_with_ai(video_url, video_title, openai_api_key):
    """Analyze Facebook video URL directly when download fails"""
    print(f"🔍 Analyzing Facebook URL directly: {video_url}")
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user", 
                "content": f"""I have a Facebook recipe video URL: {video_url}

The video title appears to be: "{video_title}"

Based on this URL and title, please generate a realistic recipe that might be featured in such a video. Consider:
- Common Facebook recipe trends
- The title/URL hints about the dish
- Typical social media recipe formats

Create a complete recipe in JSON format:
{{
    "title": "Recipe name based on context",
    "description": "Description of the dish",
    "prep_time": "X minutes",
    "cook_time": "X minutes",
    "servings": "X",
    "ingredients": ["ingredient list"],
    "instructions": ["step by step"],
    "notes": ["helpful tips"]
}}"""
            }],
            temperature=0.7,
            max_tokens=1500
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            recipe_data = json.loads(json_str)
            return recipe_data
        
        return None
        
    except Exception as e:
        print(f"❌ URL analysis error: {str(e)}")
        return None

def extract_key_frames(video_path, max_frames=8):
    """Extract key frames from video for AI analysis"""
    frames = []
    
    try:
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps
        
        # Extract frames at regular intervals
        interval = max(1, int(total_frames / max_frames))
        
        frame_count = 0
        while cap.isOpened() and len(frames) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
                
            if frame_count % interval == 0:
                # Convert frame to base64 for API
                _, buffer = cv2.imencode('.jpg', frame)
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                frames.append(frame_b64)
                
            frame_count += 1
        
        cap.release()
        print(f"🎬 Extracted {len(frames)} frames from {duration:.1f}s video")
        
    except Exception as e:
        print(f"❌ Frame extraction error: {str(e)}")
    
    return frames

    """Extract key frames from video for AI analysis"""
    frames = []
    
    try:
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps
        
        # Extract frames at regular intervals
        interval = max(1, int(total_frames / max_frames))
        
        frame_count = 0
        while cap.isOpened() and len(frames) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
                
            if frame_count % interval == 0:
                # Convert frame to base64 for API
                _, buffer = cv2.imencode('.jpg', frame)
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                frames.append(frame_b64)
                
            frame_count += 1
        
        cap.release()
        print(f"🎬 Extracted {len(frames)} frames from {duration:.1f}s video")
        
    except Exception as e:
        print(f"❌ Frame extraction error: {str(e)}")
    
    return frames

def analyze_frames_with_ai(frames, video_title, openai_api_key):
    """Send frames to OpenAI for recipe analysis"""
    
    try:
        from openai import OpenAI
        
        # Build the messages for OpenAI
        content = [
            {
                "type": "text",
                "text": f"""Analyze these cooking video frames from: "{video_title}"

Look carefully at what you see in the frames to determine:
- The recipe being made
- Ingredients being added 
- Cooking techniques and methods shown
- Equipment and tools being used
- Timing and sequence of steps
- Text overlays or labels with measurements

Based on what you ACTUALLY SEE, generate a complete recipe in JSON format:
{{
    "title": "Recipe Name from Video",
    "description": "Description based on observations",
    "prep_time": "X minutes",
    "cook_time": "X minutes", 
    "servings": "X",
    "ingredients": [
        "1 cup ingredient name",
        "2 tbsp another ingredient"
    ],
    "instructions": [
        "Step 1: Detailed instruction...",
        "Step 2: Next step..."
    ],
    "notes": [
        "Cooking tip from video",
        "Equipment note"
    ]
}}"""
            }
        ]
        
        # Add all frame images
        for frame_b64 in frames:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{frame_b64}",
                    "detail": "high"
                }
            })
        
        # Make OpenAI API call
        client = OpenAI(api_key=openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": content}],
            max_tokens=2000,
            temperature=0.3
        )
        
        ai_response = response.choices[0].message.content
        
        # Try to parse JSON response
        try:
            import json
            json_start = ai_response.find('{')
            json_end = ai_response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = ai_response[json_start:json_end]
                recipe_data = json.loads(json_str)
                
                print(f"🍳 AI detected recipe: '{recipe_data.get('title', 'Unknown')}'")
                return recipe_data
            else:
                return {"raw_analysis": ai_response}
        except:
            return {"raw_analysis": ai_response}
            
    except Exception as e:
        print(f"❌ OpenAI analysis error: {str(e)}")
        return None
  
def try_facebook_alternatives(video_url):
    """Try alternative methods for Facebook videos when yt-dlp fails"""
    print("🔧 Trying alternative Facebook extraction methods...")
    
    # INITIALIZE alternative_file at the start
    alternative_file = None  # ADD this line
    
    # Method 1: Try different Facebook URL formats
    alternative_urls = []
    
    # Extract video ID from URL
    import re
    video_id_match = re.search(r'/reel/(\d+)', video_url)
    if video_id_match:
        video_id = video_id_match.group(1)
        alternative_urls = [
            f"https://www.facebook.com/watch/?v={video_id}",
            f"https://m.facebook.com/watch/?v={video_id}",
            f"https://facebook.com/{video_id}/videos/{video_id}",
        ]
    
    # Try each alternative URL
    for alt_url in alternative_urls:
        try:
            print(f"🔄 Trying alternative URL: {alt_url}")
            
            ydl_opts = {
                'format': 'worst[ext=mp4]/worst',  # Use worst quality for faster processing
                'outtmpl': '/tmp/facebook_audio.%(ext)s',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '64',  # Lower quality for faster processing
                }],
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.facebook.com/',
                },
                'ignoreerrors': True,
                'no_warnings': True,
                'extract_flat': False,
                'age_limit': None,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([alt_url])
                
            # Check if file was created
            if os.path.exists('/tmp/facebook_audio.mp3'):
                print("✅ Alternative Facebook extraction successful!")
                alternative_file = '/tmp/facebook_audio.mp3'  # SET the variable
                break  # BREAK on success
                
        except Exception as e:
            print(f"❌ Alternative URL {alt_url} failed: {str(e)}")
            continue
    
    return alternative_file  # This should now always be defined

def parse_ai_ingredients(raw_ingredients):
    """ENHANCED: Parse AI-generated ingredient strings into structured format"""
    formatted_ingredients = []
    
    for ingredient in raw_ingredients:
        if isinstance(ingredient, dict):
            # Already structured - just ensure all fields exist
            formatted_ingredients.append({
                "name": ingredient.get("name", ""),
                "amount": ingredient.get("amount", ""),
                "unit": ingredient.get("unit", ""),
                "optional": ingredient.get("optional", False)
            })
        elif isinstance(ingredient, str):
            # Parse string like "2 packets Spanish rice mix" or "1 jar chunky salsa"
            parts = ingredient.strip().split()
            
            amount = ""
            unit = ""
            name = ingredient  # Default to full string
            
            if len(parts) >= 1:
                # Enhanced number detection including fractions and decimals
                first_part = parts[0]
                
                # Check for common fractions and numbers
                if (first_part.replace('.', '').replace('/', '').replace('-', '').isdigit() or 
                    first_part in ['1/4', '1/2', '3/4', '1/3', '2/3', '2/3', '3/4', '1/8', '3/8', '5/8', '7/8'] or
                    first_part.replace('.', '').isdigit()):
                    
                    amount = first_part
                    
                    if len(parts) >= 2:
                        # Enhanced unit detection
                        units = [
                            'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
                            'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces', 
                            'gram', 'grams', 'g', 'kg', 'kilogram', 'kilograms',
                            'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters',
                            'packet', 'packets', 'package', 'packages', 'can', 'cans',
                            'jar', 'jars', 'bottle', 'bottles', 'slice', 'slices',
                            'piece', 'pieces', 'clove', 'cloves', 'head', 'heads',
                            'bunch', 'bunches', 'stalk', 'stalks', 'sprig', 'sprigs'
                        ]
                        
                        potential_unit = parts[1].lower().rstrip(',.')
                        
                        if potential_unit in units:
                            unit = potential_unit
                            # Rest is the ingredient name
                            if len(parts) >= 3:
                                name = ' '.join(parts[2:])
                            else:
                                name = ""
                        else:
                            # No recognized unit, everything after amount is the name
                            name = ' '.join(parts[1:])
                    else:
                        # Only amount, no unit or name
                        name = ""
                else:
                    # First part isn't a number, treat whole string as name
                    name = ingredient
            
            # Clean up the name (remove trailing commas, etc.)
            name = name.strip().rstrip(',.')
            
            formatted_ingredients.append({
                "name": name,
                "amount": amount,
                "unit": unit,
                "optional": False
            })
            
    print(f"📝 Parsed {len(formatted_ingredients)} ingredients:")
    for i, ing in enumerate(formatted_ingredients, 1):
        print(f"   {i}. Amount: '{ing['amount']}', Unit: '{ing['unit']}', Name: '{ing['name']}'")
            
    return formatted_ingredients

def generate_recipe_tags(title, description):
    """Generate relevant tags based on recipe content - ENHANCED VERSION"""
    tags = []
    
    title_lower = title.lower()
    desc_lower = description.lower()
    combined_text = f"{title_lower} {desc_lower}"
    
    # Protein tags
    proteins = {
        'chicken': ['chicken', 'poultry'], 'beef': ['beef', 'steak'], 
        'pork': ['pork', 'bacon', 'ham'], 'fish': ['fish', 'salmon', 'tuna'],
        'turkey': ['turkey'], 'shrimp': ['shrimp', 'prawns'],
        'lamb': ['lamb'], 'duck': ['duck']
    }
    for protein, keywords in proteins.items():
        if any(keyword in combined_text for keyword in keywords):
            tags.append(protein)
    
    # Cooking method tags
    cooking_methods = {
        'baked': ['baked', 'baking', 'oven'], 'fried': ['fried', 'frying', 'crispy'],
        'grilled': ['grilled', 'bbq', 'barbecue'], 'roasted': ['roasted', 'roast'],
        'sauteed': ['sauteed', 'saute', 'pan'], 'steamed': ['steamed', 'steam'],
        'braised': ['braised', 'slow cooked'], 'no-bake': ['no bake', 'no-bake', 'raw']
    }
    for method, keywords in cooking_methods.items():
        if any(keyword in combined_text for keyword in keywords):
            tags.append(method)
    
    # Cuisine tags
    cuisines = {
        'italian': ['italian', 'pasta', 'pizza', 'parmesan', 'basil', 'marinara'],
        'mexican': ['mexican', 'taco', 'burrito', 'salsa', 'cilantro', 'lime'],
        'asian': ['asian', 'soy sauce', 'ginger', 'sesame', 'rice'],
        'chinese': ['chinese', 'stir fry', 'wok'], 'thai': ['thai', 'curry', 'coconut'],
        'indian': ['indian', 'curry', 'turmeric', 'cumin'], 'french': ['french', 'butter', 'wine'],
        'mediterranean': ['mediterranean', 'olive oil', 'olives', 'feta']
    }
    for cuisine, keywords in cuisines.items():
        if any(keyword in combined_text for keyword in keywords):
            tags.append(cuisine)
    
    # Diet tags
    diet_indicators = {
        'vegetarian': ['vegetarian', 'veggie', 'no meat'],
        'vegan': ['vegan', 'plant based', 'dairy free'],
        'keto': ['keto', 'low carb', 'high fat'], 'paleo': ['paleo', 'grain free'],
        'gluten-free': ['gluten free', 'gluten-free'], 'low-calorie': ['low calorie', 'light'],
        'high-protein': ['high protein', 'protein'], 'dairy-free': ['dairy free', 'lactose free']
    }
    for diet, keywords in diet_indicators.items():
        if any(keyword in combined_text for keyword in keywords):
            tags.append(diet)
    
    # Meal type
    meal_types = {
        'breakfast': ['breakfast', 'morning', 'pancake', 'eggs', 'cereal'],
        'lunch': ['lunch', 'sandwich', 'salad', 'soup'],
        'dinner': ['dinner', 'main course', 'entree'],
        'dessert': ['dessert', 'sweet', 'cake', 'cookie', 'chocolate', 'ice cream'],
        'snack': ['snack', 'appetizer', 'finger food'],
        'brunch': ['brunch', 'weekend']
    }
    for meal, keywords in meal_types.items():
        if any(keyword in combined_text for keyword in keywords):
            tags.append(meal)
    
    # Dish-specific tags
    specific_dishes = {
        'pasta': ['pasta', 'spaghetti', 'linguine', 'penne'],
        'soup': ['soup', 'broth', 'stew'], 'salad': ['salad', 'greens'],
        'sandwich': ['sandwich', 'burger', 'wrap'], 'pizza': ['pizza'],
        'cake': ['cake', 'cupcake'], 'cookies': ['cookie', 'cookies'],
        'bread': ['bread', 'loaf'], 'smoothie': ['smoothie', 'blend']
    }
    for dish, keywords in specific_dishes.items():
        if any(keyword in combined_text for keyword in keywords):
            tags.append(dish)
    
    # Remove duplicates and limit
    unique_tags = list(set(tags))
    return unique_tags[:5]  # Limit to 5 tags

def analyze_recipe_nutrition_with_ai(recipe_data, openai_api_key):
    """Comprehensive nutrition analysis matching your MongoDB schema"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        # FIX: Handle structured ingredient objects
        ingredients = recipe_data.get('ingredients', [])
        ingredients_text = ""
        
        for ing in ingredients:
            if isinstance(ing, dict):
                amount = ing.get('amount', '')
                unit = ing.get('unit', '')
                name = ing.get('name', '')
                ing_str = f"- {amount} {unit} {name}".strip()
                ingredients_text += ing_str + "\n"
            else:
                ingredients_text += f"- {str(ing)}\n"
        
        # FIX: Handle structured instruction objects
        instructions = recipe_data.get('instructions', [])
        instructions_text = ""
        for inst in instructions[:3]:
            if isinstance(inst, dict):
                text = inst.get('text', inst.get('instruction', ''))
                instructions_text += f"{text} "
            else:
                instructions_text += f"{str(inst)} "
        
        prompt = f"""Provide comprehensive nutritional analysis for this recipe matching the exact schema format.

Recipe: {recipe_data.get('title', 'Unknown Recipe')}
Servings: {recipe_data.get('servings', '4')}

Ingredients:
{ingredients_text}

Instructions: {instructions_text}...

Calculate detailed nutrition PER SERVING and respond with JSON in this EXACT format:
{{
    "nutrition": {{
        "calories": {{"value": 385, "unit": "kcal", "name": "Energy"}},
        "protein": {{"value": 32, "unit": "g", "name": "Protein"}},
        "fat": {{"value": 18, "unit": "g", "name": "Total Fat"}},
        "saturatedFat": {{"value": 6, "unit": "g", "name": "Saturated Fat"}},
        "carbs": {{"value": 12, "unit": "g", "name": "Total Carbohydrate"}},
        "fiber": {{"value": 3, "unit": "g", "name": "Dietary Fiber"}},
        "sugars": {{"value": 4, "unit": "g", "name": "Total Sugars"}},
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
        
        "calculationMethod": "ai_calculated",
        "dataSource": "ai_analysis",
        "confidence": 0.85,
        "coverage": 0.90
    }},
    
    "tags": ["high-protein", "low-carb", "main-dish"]
}}

Guidelines:
- Values should be realistic for the ingredients and cooking method
- Include ALL nutrients from the schema (set to 0 if not applicable)
- Be conservative but accurate with estimates
- Consider cooking method effects on nutrients
- Use exact field names from the MongoDB schema"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.2
        )
        
        ai_response = response.choices[0].message.content
        print(f"🥗 Comprehensive nutrition analysis completed. Response length: {len(ai_response)}")
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            nutrition_data = json.loads(json_str)
            
            print(f"✅ Nutrition analysis successful! Confidence: {nutrition_data.get('nutrition', {}).get('confidence', 0)}")
            return nutrition_data
            
        return None
        
    except Exception as e:
        print(f"❌ Nutrition analysis error: {str(e)}")
        return None
    

def calculate_openai_cost(tokens):
    """Calculate approximate cost for GPT-4o"""
    input_cost = 0.005 / 1000  # $0.005 per 1K input tokens
    output_cost = 0.015 / 1000  # $0.015 per 1K output tokens
    # Approximate 70% input, 30% output
    return (tokens * 0.7 * input_cost) + (tokens * 0.3 * output_cost)

def detect_platform_from_url_enhanced(video_url):
    """Enhanced platform detection for universal video support"""
    if not video_url:
        return "unknown"
        
    url_lower = video_url.lower()
    
    # Existing social media platforms
    if "tiktok.com" in url_lower or "vm.tiktok.com" in url_lower:
        return "tiktok"
    elif "instagram.com" in url_lower:
        return "instagram"
    elif "facebook.com" in url_lower or "fb.watch" in url_lower:
        return "facebook"
    
    # NEW: Additional platforms
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"
    elif "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    elif "reddit.com" in url_lower or "redd.it" in url_lower:
        return "reddit"
    elif "pinterest.com" in url_lower:
        return "pinterest"
    elif "snapchat.com" in url_lower:
        return "snapchat"
    elif "bsky.app" in url_lower or "bluesky.app" in url_lower:
        return "bluesky"
    
    # Check for direct video file URLs
    elif any(ext in url_lower for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']):
        return "direct_video"
    
    # Generic video platform detection
    elif any(keyword in url_lower for keyword in ['video', 'watch', 'play', 'stream']):
        return "generic_video"
    
    return "unknown"

def extract_universal_video_content(video_url, openai_api_key, extract_image=False):
    """Universal video content extraction for new platforms"""
    import yt_dlp
    import time
    import os
    
    platform = detect_platform_from_url_enhanced(video_url)
    print(f"🌍 Universal video extraction for {platform}: {video_url}")
    
    try:
        strategies = get_universal_download_strategies(video_url, platform)
        temp_video = None
        video_title = f"{platform.title()} Recipe Video"
        
        for strategy_num, ydl_opts in enumerate(strategies, 1):
            try:
                print(f"🔄 Trying universal strategy {strategy_num} for {platform}...")
                
                ydl_opts.update({
                    'quiet': True,
                    'no_warnings': True,
                    'ignoreerrors': True,
                })
                
                    # Get video info first
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    try:
                        info = ydl.extract_info(video_url, download=False)
                        video_title = info.get('title', f'{platform.title()} Recipe Video')
                        
                    except Exception as info_error:
                        print(f"⚠️ Could not extract {platform} video info: {info_error}")
                    
                    # Try to download
                    temp_video = f"/tmp/{platform}_video_{int(time.time())}.mp4"
                    ydl_opts['outtmpl'] = temp_video
                    
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl_download:
                        ydl_download.download([video_url])
                    
                    # Check if file exists and is valid
                    if os.path.exists(temp_video) and os.path.getsize(temp_video) > 1000:
                        print(f"✅ Universal strategy {strategy_num} successful for {platform}!")
                        break
                        
            except Exception as e:
                print(f"❌ Universal strategy {strategy_num} failed for {platform}: {str(e)}")
                if temp_video and os.path.exists(temp_video):
                    os.remove(temp_video)
                temp_video = None
                continue
        
        # If download worked, analyze with AI
        if temp_video and os.path.exists(temp_video):
            frames = extract_key_frames(temp_video)
            print(f"📸 Extracted {len(frames)} frames from {platform} video")
            
            if frames:
                recipe_data = analyze_frames_with_ai(frames, video_title, openai_api_key)
                
                # Extract image if requested
                extracted_image = None
                if extract_image and frames:
                    try:
                        print("🖼️ Extracting recipe image from video...")
                        # Convert frames to proper format for image extraction
                        video_frames = extract_video_frames(temp_video, max_frames=15)
                        if video_frames and recipe_data:
                            best_frame = select_best_food_frame(video_frames, recipe_data, openai_api_key)
                            if best_frame is not None:
                                frame_b64 = encode_frame_to_base64(best_frame)
                                if frame_b64:
                                    extracted_image = {
                                        "data": frame_b64,
                                        "extractionMethod": "video_frame_analysis",
                                        "frameCount": len(video_frames)
                                    }
                                    print("✅ Successfully extracted recipe image")
                    except Exception as img_error:
                        print(f"⚠️ Image extraction failed: {img_error}")
                
                recipe_data = post_process_recipe_data(recipe_data, openai_api_key)
                
                # Cleanup
                if os.path.exists(temp_video):
                    os.remove(temp_video)
                
                result = {
                    "success": True,
                    "recipe": recipe_data,
                    "extraction_method": "video_download_fallback",
                    "platform": platform
                }
                
                # Add extracted image if available
                if extracted_image:
                    result["extracted_image"] = extracted_image
                    print(f"📸 MODAL DEBUG: Including extracted_image in response: {type(extracted_image)}")
                    print(f"📸 MODAL DEBUG: Image data length: {len(extracted_image.get('data', ''))}")
                else:
                    print(f"📸 MODAL DEBUG: No extracted_image to include")
                
                print(f"📸 MODAL DEBUG: Final result keys: {list(result.keys())}")
                return result
        
        # If video download fails, return failure
        return {
            "success": False,
            "error": f"Could not download or process video from {platform}",
            "platform": platform
        }
        
    except Exception as e:
        print(f"❌ Universal video extraction error for {platform}: {str(e)}")
        return {"success": False, "error": str(e), "platform": platform}

def analyze_url_with_ai_fallback(video_url, platform, openai_api_key):
    """Final fallback: AI generates recipe based on URL and platform trends"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user", 
                "content": f"""I have a {platform} URL that I cannot process: {video_url}

Based on current {platform} food trends and common recipe patterns, generate a realistic recipe that might be featured on this platform.

Consider:
- Popular {platform} recipe formats and trends
- Common ingredients and cooking methods on {platform}
- Typical social media recipe presentation style

Create a complete recipe in JSON format:
{{
    "title": "Trendy {platform}-style recipe name",
    "description": "Description focusing on {platform} appeal",
    "prep_time": "X minutes",
    "cook_time": "X minutes", 
    "servings": "X",
    "ingredients": ["ingredient list with measurements"],
    "instructions": ["step by step instructions"],
    "tags": ["{platform}-trending", "quick", "visual"],
    "notes": ["Tips for {platform}-worthy presentation"]
}}"""
            }],
            temperature=0.7,
            max_tokens=1500
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            recipe_data = json.loads(json_str)

            recipe_data = post_process_recipe_data(recipe_data, openai_api_key)

            recipe_data.update({
                "source": video_url,
                "extraction_method": "ai_url_analysis_fallback",
                "platform": platform
            })
            
            return {
                "success": True,
                "recipe": recipe_data,
                "extraction_method": "ai_fallback",
                "platform": platform,
                "note": f"Generated based on {platform} trends due to processing limitations"
            }
        
        return {"success": False, "error": "AI fallback failed", "platform": platform}
        
    except Exception as e:
        print(f"❌ AI fallback error: {str(e)}")
        return {"success": False, "error": str(e), "platform": platform}

def post_process_recipe_data(recipe_data, openai_api_key):
    """Universal post-processing for all recipe extraction methods"""
    
    if not recipe_data:
        return recipe_data
    
    try:
        print(f"🔧 Post-processing recipe data...")
        
        # Parse ingredients
        if 'ingredients' in recipe_data and recipe_data['ingredients']:
            recipe_data['ingredients'] = parse_ai_ingredients(recipe_data['ingredients'])
        
        # Clean instructions
        if 'instructions' in recipe_data and recipe_data['instructions']:
            for i, instruction in enumerate(recipe_data['instructions']):
                if isinstance(instruction, str):
                    import re
                    clean_text = re.sub(r'^Step \d+:\s*', '', instruction.strip())
                    recipe_data['instructions'][i] = {
                        "text": clean_text,
                        "step": i + 1,
                        "videoTimestamp": None,
                        "videoLink": None
                    }
                elif isinstance(instruction, dict) and 'text' in instruction:
                    import re
                    clean_text = re.sub(r'^Step \d+:\s*', '', instruction['text'].strip())
                    instruction['text'] = clean_text
        
        # Add nutrition analysis
        nutrition_result = analyze_recipe_nutrition_with_ai(recipe_data, openai_api_key)
        if nutrition_result and nutrition_result.get('nutrition'):
            recipe_data['nutrition'] = nutrition_result['nutrition']
        
        # Generate tags
        recipe_tags = generate_recipe_tags(
            recipe_data.get('title', ''), 
            recipe_data.get('description', '')
        )
        existing_tags = recipe_data.get('tags', [])
        recipe_data['tags'] = list(set(existing_tags + recipe_tags))[:10]
        
        return recipe_data
        
    except Exception as e:
        print(f"❌ Post-processing error: {e}")
        return recipe_data

@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    memory=4096,
    cpu=2,
    secrets=[modal.Secret.from_name("openai-api-key")]
)
@modal.fastapi_endpoint(method="POST")
def extract_recipe_from_social_video(item: dict) -> Dict[str, Any]:
    """UNIVERSAL: Extract a recipe from ANY platform using hybrid page scraping + video download"""
    import tempfile
    import os
    
    # Extract parameters
    video_url = item.get("video_url")
    platform = item.get("platform", "unknown")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    analysis_type = item.get("analysis_type", "page_scraping_first")
    extract_image = item.get("extract_image", False)
    user_context = item.get("user_context", {
        'location': 'US',
        'measurementSystem': 'imperial',
        'currency': 'USD'
    })
    print(f"🌍 Received user context: {user_context}")
    
    print(f"🌟 UNIVERSAL PROCESSING: {video_url}")
    
    # Validate parameters
    if not video_url:
        return {
            "success": False,
            "error": "video_url is required",
            "platform": platform
        }
    
    if not openai_api_key:
        return {
            "success": False,
            "error": "OpenAI API key not found in environment",
            "platform": platform
        }
    
    if not platform or platform == "auto-detect" or platform == "unknown":
        platform = detect_platform_from_url_enhanced(video_url)
        print(f"🔍 Auto-detected platform: {platform}")
    
    print(f"🌟 Processing {platform} content: {video_url}")
    
    # ENHANCED: Use existing extract_recipe_from_any_platform function
    try:
        print(f"🌟 UNIVERSAL EXTRACTION: {platform} - {video_url}")
        
        # Use your existing universal extraction function
        result = extract_recipe_from_any_platform(video_url, platform, openai_api_key, extract_image, user_context)
        
        if result and result.get('success'):
            print(f"✅ Universal extraction successful for {platform}!")
            return result
        
        print(f"⚠️ Universal extraction failed for {platform}")
        
    except Exception as extraction_error:
        print(f"⚠️ Universal extraction error for {platform}: {extraction_error}")
    
    # Fallback: Try platform-specific extraction for Facebook only
    if platform == "facebook":
        try:
            print(f"🎥 Trying Facebook-specific extraction...")
            result = extract_facebook_video_content(video_url, openai_api_key, extract_image)
            
            if result and result.get('success'):
                return result
                
        except Exception as fb_error:
            print(f"❌ Facebook extraction failed: {fb_error}")
    
    # Final fallback: Universal video extraction
    try:
        print(f"🔄 Final fallback: Trying universal video extraction...")
        return extract_universal_video_content(video_url, openai_api_key, extract_image)
    except Exception as universal_error:
        print(f"❌ Universal video extraction failed: {universal_error}")
    
    # All methods failed
    return {
        "success": False,
        "error": f"Could not download or process video from {platform}",
        "platform": platform,
        "url": video_url,
        "suggestion": f"Try copying the {platform} post text and using the Text Parser instead",
        "fallback_method": "text_paste",
        "support_note": f"{platform.title()} videos may require special permissions or may be private"
    }

    
def download_video_with_ytdlp(video_url: str, platform: str, temp_dir: str) -> str:
    """Download video specifically for image extraction"""
    
    try:
        import yt_dlp
        
        # Platform-specific download options
        if platform == "tiktok":
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'outtmpl': os.path.join(temp_dir, 'video_for_image.%(ext)s'),
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Referer': 'https://www.tiktok.com/',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                },
                'extractor_args': {
                    'tiktok': {
                        'webpage_url_basename': 'video'
                    }
                },
                'cookiefile': None,  # Don't use cookies
                'ignoreerrors': False,
            }
        elif platform == "instagram":
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'outtmpl': os.path.join(temp_dir, 'video_for_image.%(ext)s'),
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
                }
            }
        elif platform == "facebook":
            ydl_opts = {
                'format': 'worst[ext=mp4]/worst',
                'outtmpl': os.path.join(temp_dir, 'video_for_image.%(ext)s'),
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                }
            }
        else:
            return None
        
        ydl_opts.update({
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': True,
        })
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
        
        # Find downloaded video file
        video_files = [f for f in os.listdir(temp_dir) if f.endswith(('.mp4', '.webm', '.mkv')) and 'video_for_image' in f]
        
        if video_files:
            video_path = os.path.join(temp_dir, video_files[0])
            print(f"✅ Downloaded video for image extraction: {video_path}")
            return video_path
        
        return None
        
    except Exception as e:
        print(f"❌ Video download for image extraction error: {str(e)}")
        return None

def analyze_tiktok_url_with_ai(video_url, openai_api_key):
    """
    Analyze TikTok URL when audio/visual analysis fails
    Generate a realistic recipe based on TikTok trends
    """
    print(f"🤖 Analyzing TikTok URL with AI: {video_url}")
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user", 
                "content": f"""I have a TikTok video URL that I cannot process due to no detectable audio or unclear visuals: {video_url}

Based on current TikTok food trends and viral recipe patterns, generate a realistic recipe that might be featured in such a video. Consider:
- Popular TikTok recipe formats (quick, trendy, visually appealing)
- Viral TikTok food trends (pasta recipes, desserts, quick hacks)
- Common ingredients featured in cooking TikToks
- Short, snappy instructions typical of TikTok format

Create a complete recipe in JSON format:
{{
    "title": "Viral TikTok-style recipe name",
    "description": "Description emphasizing visual appeal and trendiness",
    "prep_time": "5-15 minutes (TikTok-appropriate)",
    "cook_time": "10-20 minutes",
    "servings": "1-4",
    "ingredients": ["ingredient list with TikTok-style measurements"],
    "instructions": ["Quick, visual step-by-step instructions"],
    "tags": ["tiktok-viral", "quick", "trendy", "visual"],
    "notes": ["TikTok-style tips and hacks"]
}}"""
            }],
            temperature=0.7,
            max_tokens=1500
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            recipe_data = json.loads(json_str)
            return recipe_data
        
        return None
        
    except Exception as e:
        print(f"❌ TikTok URL analysis error: {str(e)}")
        return None

def extract_recipe_with_openai(transcript_text, platform, openai_api_key):
    """Extract recipe from transcript using OpenAI with enhanced tag generation"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        # Enhanced prompt for better tag generation
        recipe_prompt = f"""
        Analyze this {platform.upper()} cooking video transcript and extract a recipe:

        TRANSCRIPT:
        {transcript_text}

        Extract a complete recipe in this exact JSON format:
        {{
          "title": "Descriptive recipe name based on what's actually being made",
          "description": "Brief description highlighting key flavors and cooking method",
          "ingredients": [
            {{"name": "ingredient", "amount": "1", "unit": "cup", "optional": false}}
          ],
          "instructions": [
            "Step 1: Clear, detailed instruction...",
            "Step 2: Next step with specific techniques..."
          ],
          "prepTime": 15,
          "cookTime": 20,
          "servings": 4,
          "difficulty": "easy",
          "tags": ["specific-dish-name", "cooking-method", "cuisine-type", "dietary-info", "meal-type"]
        }}

        IMPORTANT for tags:
        - Include the specific dish/recipe name (e.g., "chicken-parmesan", "chocolate-chip-cookies")
        - Add cooking method (e.g., "baked", "fried", "grilled", "no-bake")
        - Include cuisine type if identifiable (e.g., "italian", "mexican", "asian")
        - Add dietary tags if applicable (e.g., "vegetarian", "gluten-free", "keto")
        - Include meal type (e.g., "breakfast", "lunch", "dinner", "dessert", "snack")
        - Avoid generic tags like "recipe" or "cooking"

        Return ONLY valid JSON, no other text.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": recipe_prompt}],
            temperature=0.2,  # Slightly higher for more creative tag generation
            max_tokens=2000
        )
        
        recipe_json = response.choices[0].message.content.strip()
        if recipe_json.startswith("```json"):
            recipe_json = recipe_json.replace("```json", "").replace("```", "").strip()
        
        import json
        recipe_data = json.loads(recipe_json)
        
        print(f"🎯 Extracted {platform} recipe: '{recipe_data.get('title', 'Unknown')}'")
        print(f"🏷️ Initial AI tags: {recipe_data.get('tags', [])}")
        
        return recipe_data
        
    except Exception as e:
        print(f"❌ OpenAI recipe extraction failed: {e}")
        return None



# Test function for all platforms
@app.function(image=image)
def test_universal_extraction():
    """Test universal extraction with various platforms"""
    
    test_cases = [
        {
            "url": "https://x.com/Gymvibe_/status/1954811897112347000",
            "platform": "twitter",
            "name": "Twitter/X Post"
        },
        {
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "platform": "youtube",
            "name": "YouTube Video"
        },
        {
            "url": "https://www.reddit.com/r/recipes/comments/abc123/amazing_pasta_recipe/",
            "platform": "reddit",
            "name": "Reddit Post"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🧪 Testing {test_case['name']}...")
        try:
            result = extract_recipe_from_social_video({
                "video_url": test_case["url"],
                "platform": test_case["platform"]
            })
            print(f"✅ {test_case['name']} test result: {result.get('success', False)}")
        except Exception as e:
            print(f"❌ {test_case['name']} test failed: {e}")
    
    return {"test": "completed"}

@app.local_entrypoint()
def main():
    print("🧪 Testing universal recipe extraction...")
    result = test_universal_extraction.remote()
    print("Final result:", result)

if __name__ == "__main__":
    main()