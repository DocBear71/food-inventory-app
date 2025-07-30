// file: src/components/legal/AboutUs.jsx v1.5.0 - Updated with store category management, meal completion enhancements, and mobile UX improvements

import React from 'react';

const AboutUs = () => {
    return (
            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '20px 40px',
                lineHeight: '1.6',
                fontFamily: 'Arial, sans-serif'
            }}>
                {/* Header Section */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '32px', color: '#2c3e50', marginBottom: '10px' }}>
                        About Doc Bear's Comfort Kitchen
                    </h1>
                    <p style={{ fontSize: '18px', color: '#7f8c8d', fontStyle: 'italic' }}>
                        Your AI-Powered Personal Food Inventory & Recipe Management Solution
                    </p>
                    <div style={{
                        backgroundColor: '#e3f2fd',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginTop: '1rem',
                        border: '2px solid #2196f3'
                    }}>
                        <p style={{
                            fontSize: '16px',
                            color: '#1565c0',
                            margin: '0',
                            fontWeight: 'bold'
                        }}>
                            🌍 Now featuring advanced store category management, enhanced meal completion with UPC lookup, improved voice input, optimized mobile experience, international barcode support, AI-powered recipe scaling, and full international compliance with GDPR & COPPA!
                        </p>
                    </div>
                </div>

                {/* About the Application Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>About Our Application</h2>
                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Doc Bear's Comfort Kitchen is a comprehensive, AI-powered web application designed to revolutionize how you manage your home food inventory and discover delicious recipes. Our platform seamlessly combines intelligent inventory tracking with advanced recipe matching, AI-powered social media recipe extraction, voice nutrition analysis, comprehensive nutritional intelligence dashboard, advanced store category management, enhanced meal completion tracking, international barcode support, intelligent recipe scaling, and full international compliance, making meal planning easier and more efficient than ever before.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Whether you're organizing your shopping with customizable store category layouts, completing meals with smart ingredient additions and UPC lookup, scanning international UPC codes from 80+ countries, scaling recipes with AI-powered intelligence, manually entering food items, importing recipes from TikTok videos, asking for nutrition information with voice commands, or exploring our extensive database of over 650 public recipes from the acclaimed "Doc Bear's Comfort Food Survival Guide" cookbook series, our application helps you make the most of what you have while discovering new culinary adventures. The intelligent recipe matching system automatically suggests meals you can make with your current inventory, provides detailed nutritional analysis, smart optimization recommendations, and even suggests recipes that are just a few ingredients away from completion.
                    </p>

                    <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0' }}>
                        <h3 style={{ fontSize: '20px', color: '#2c3e50', marginBottom: '1rem' }}>Comprehensive Features</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🏪 Advanced Store Category Management</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Drag & Drop Ordering:</strong> Intuitive drag and drop interface for reordering categories to match your shopping flow.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Quick Movement Controls:</strong> Jump to position, bulk moves (±5), top/bottom positioning for efficient category management.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Store Layout Templates:</strong> Pre-configured layouts including Fresh-First, Food Safety, and Perimeter-First shopping patterns.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Category Visibility Control:</strong> Hide/show categories for personalized shopping lists based on your shopping needs.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Mobile-Optimized Interface:</strong> Responsive design with optimized touch targets and spacing for mobile category management.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🍳 Enhanced Meal Completion Tracking</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Extra Ingredient Addition:</strong> Add ingredients used during cooking that weren't in the original recipe.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>UPC Lookup Integration:</strong> Instantly add missing inventory items with barcode scanning during meal completion.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Smart Suggestions:</strong> Intelligent recommendations for partial-use items like spices, oils, and condiments.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Seamless Inventory Integration:</strong> Automatic inventory updates when completing meals with real-time synchronization.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Cooking Workflow Optimization:</strong> Streamlined process for tracking actual ingredients used versus planned ingredients.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🌍 International Barcode & Product Support</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Global Barcode Recognition:</strong> Supports EAN-8, EAN-13, UPC-A, and GTIN-14 formats with automatic country detection for 80+ countries.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Regional Database Integration:</strong> Prioritizes UK/EU Open Food Facts databases for international users with smart regional fallbacks.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Currency-Aware Optimization:</strong> Automatically detects and optimizes searches based on user's currency and regional preferences.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>GS1 Prefix Analysis:</strong> Intelligent barcode analysis shows product origin and provides regional context for better accuracy.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Multi-Language Support:</strong> Includes proper localization for international users with regional category mapping and cultural adaptations.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>⚖️ AI-Powered Recipe Scaling & Unit Conversion</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Intelligent Recipe Scaling:</strong> AI-powered scaling that goes beyond simple math - smart handling of seasonings, leavening agents, and aromatics.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>US ⟷ Metric Conversion:</strong> Context-aware conversions between US standard and metric measurements with cultural adaptations.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Cooking Method Adjustments:</strong> Provides intelligent suggestions for cooking time, pan sizes, and equipment changes for scaled recipes.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Practical Measurements:</strong> Converts awkward measurements to practical equivalents (e.g., "7.3 eggs" becomes "7 eggs + 1 egg white").
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Regional Recipe Adaptation:</strong> Adapts recipes for different countries with local ingredient availability and cultural preferences.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🎤 Enhanced Voice Input System</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Improved Android Integration:</strong> Better guidance for Android app selection with optimized voice processing.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Non-Blocking Success Messages:</strong> User-friendly notifications that don't interrupt workflow.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Enhanced Error Handling:</strong> Improved error recovery and user guidance for voice input issues.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Voice Nutrition Queries:</strong> Ask about nutrition information for any inventory item using natural voice commands.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Smart Voice Recognition:</strong> AI-powered voice processing that understands natural language nutrition questions.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🔒 International Compliance & Privacy Protection</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>GDPR Compliance:</strong> Full European data protection compliance with explicit consent management and data rights tracking.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Minor Protection:</strong> COPPA-compliant age verification with parental consent requirements for users under 18.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Multi-Jurisdictional Support:</strong> Compliance with US, EU, UK, Canada, and Australia privacy regulations.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Granular Consent:</strong> Feature-specific consent for voice processing, international transfers, and data processing.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Audit Trails:</strong> Complete compliance tracking with detailed consent history and user rights management.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🤖 AI-Powered Recipe Extraction</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Social Media Integration:</strong> Import recipes directly from TikTok, Instagram, Facebook, and YouTube videos using advanced AI analysis.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Mobile Share Integration:</strong> Share videos from social media apps directly to Doc Bear's for automatic recipe extraction.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Visual & Audio Analysis:</strong> AI processes both audio narration and visual cooking steps with fallback analysis for silent videos.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Receipt Processing:</strong> AI-powered receipt analysis for quick inventory updates from shopping trips.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📊 Comprehensive Nutrition Intelligence Dashboard</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Smart Analytics:</strong> AI-powered nutrition dashboard with comprehensive insights and intelligent recommendations.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Inventory Optimization:</strong> Smart suggestions to reduce waste, save money, and improve nutrition with actionable recommendations.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Recipe Suggestions:</strong> AI-generated recipe recommendations based on your current inventory with smart insights.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Smart Shopping Lists:</strong> AI-powered shopping list generation with budget optimization and cost estimation.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Nutrition Goals Tracking:</strong> Set and monitor personal nutrition targets with progress visualization and recommendations.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🏠 Advanced Smart Inventory Management</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Enhanced International UPC Scanning:</strong> Scan barcodes from 80+ countries with automatic format detection and regional optimization.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Multi-Database Search:</strong> Search across Open Food Facts (UK/EU/Global), USDA, and regional databases for comprehensive product coverage.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Advanced Search & Filtering:</strong> Search inventory by name, filter by categories, expiration dates, locations, and status with powerful sorting options.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Smart Categories:</strong> Organize inventory with intelligent categorization including produce, dairy, proteins, pantry staples, and more.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Complete Item Management:</strong> Edit items to add brand names, expiration dates, multiple storage locations, price tracking, and detailed notes.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Comprehensive Tracking:</strong> Monitor consumption, waste, donations with detailed history tracking and expiration alerts.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Smart Status System:</strong> Track items as "Good," "Expiring Soon," "Expired," or "Used" with automatic status updates.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>👨‍🍳 Enhanced Recipe Discovery & Management</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Extensive Recipe Database:</strong> Access to over 650 public recipes, primarily from the Doc Bear's Comfort Food Survival Guide cookbook series.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Advanced Recipe Search:</strong> Search your recipe collection by title, ingredients, categories, or cooking methods with intelligent filtering.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>"What Can I Make?" Intelligence:</strong> Advanced recipe matching based on your current inventory with percentage-based ingredient matching and smart suggestions.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>AI-Powered Recipe Scaling:</strong> Intelligently scale recipes up or down with smart adjustments for seasonings, leavening, and cooking methods.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Recipe Photos:</strong> Add photos to recipes from uploads or social media imports for visual recipe management.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Simple Meals Matching:</strong> Discover simple meal combinations using your inventory items without requiring complex recipes.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🥗 Advanced Nutritional Analysis & Tracking</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Comprehensive Nutrition Data:</strong> Detailed nutritional information including calories, macros (protein, carbs, fats), vitamins, minerals, and micronutrients.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Recipe Nutrition Analysis:</strong> Automatic calculation of complete nutritional profiles for all recipes, including per-serving breakdowns.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Scaled Recipe Nutrition:</strong> Automatically recalculates nutritional information when recipes are scaled or converted between measurement systems.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Meal Plan Nutrition Tracking:</strong> Monitor nutritional content across entire meal plans and individual meals with daily/weekly summaries.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Personal Nutrition Goals:</strong> Set and track personal nutrition targets within your profile settings with progress monitoring.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📅 Advanced Meal Planning & Templates</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Flexible Planning:</strong> Plan meals for multiple weeks with customizable meal times per day (breakfast, lunch, dinner, snacks) based on your preferences.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Meal Planning Templates:</strong> Save and reuse common meal planning patterns, including weekly templates and seasonal meal plans.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Recipe & Simple Meal Integration:</strong> Plan using specific recipes or create quick meals from inventory items with nutritional tracking.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Meal Prep Planning:</strong> Generate detailed weekly meal prep lists to plan and organize ingredient preparation in advance.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Nutritional Overview:</strong> Monitor nutritional information from recipes and ingredients across your entire meal plan with goal tracking.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📋 Intelligent Shopping Lists & Budget Management</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Multiple Generation Methods:</strong> Create shopping lists from individual recipes, "What Can I Make?" suggestions, weekly meal plans, or custom recipe collections.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Smart Shopping List Generator:</strong> Select multiple recipes to create comprehensive shopping lists with organized categories and quantity consolidation.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>International Currency Support:</strong> Price tracking and budget management in 40+ currencies with regional optimization.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Price Tracking & Totals:</strong> Add prices to shopping list items with automatic total calculations and budget tracking.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Budget Alerts:</strong> Set shopping budgets with alerts when approaching or exceeding spending limits.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Email Integration:</strong> Send shopping lists directly to family and friends via email for collaborative shopping.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>👑 Professional Admin Dashboard</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Complete User Management:</strong> Administrative controls for user account management, statistics tracking, and system monitoring.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Account Upgrades:</strong> Manage user account upgrades and premium features with automated email notifications.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>User Suspension Controls:</strong> Administrative tools for user suspension and account management with notification systems.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>System Analytics:</strong> Comprehensive usage statistics and system performance monitoring for platform optimization.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📱 Multi-Device Access & PWA</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Cross-Platform Compatibility:</strong> Works seamlessly on desktop and mobile devices with responsive design and optimized mobile experience.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Progressive Web App (PWA):</strong> Full PWA functionality with app-like experience, offline capabilities, and mobile-first design.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Native Mobile Integration:</strong> Share content directly from social media apps to Doc Bear's recipe extractor on mobile devices.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Coming Soon:</strong> Native mobile apps available in Google Play Store and Apple App Store.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📧 Smart Notification System</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Automated Email Notifications:</strong> Receive notifications for account upgrades, suspensions, and important account changes.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Expiration Alerts:</strong> Customizable email notifications for food items approaching expiration dates.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Meal Planning Reminders:</strong> Optional reminders for meal prep, shopping, and cooking schedules.
                                </p>
                            </div>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>⚙️ Enhanced Personalized Profile Settings</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>International Preferences:</strong> Support for 40+ currencies, regions, unit systems, and localization preferences.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Barcode Preferences:</strong> Configure which barcode formats to accept (EAN-8, EAN-13, UPC-A, GTIN-14) and regional prioritization.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Advanced Meal Planning Preferences:</strong> Set dietary restrictions, ingredients to avoid, preferred cuisines, and meal planning preferences.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Detailed Nutrition Goals:</strong> Establish personal nutrition targets including calories, macros, vitamins, and minerals with progress tracking.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Budget Management:</strong> Set shopping budgets and financial goals for meal planning and grocery management in your local currency.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Version History Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>Recent Updates</h2>

                    <div style={{ backgroundColor: '#e8f5e8', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #28a745' }}>
                        <h3 style={{ fontSize: '18px', color: '#155724', marginBottom: '1rem' }}>Version 1.5.0 (Latest) - Advanced Store Management & Enhanced User Experience</h3>
                        <ul style={{ color: '#155724', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Complete category ordering system with drag & drop functionality for personalized shopping flows</li>
                            <li style={{ marginBottom: '0.5rem' }}>Quick movement controls: jump to position, bulk moves (±5), top/bottom positioning for efficient management</li>
                            <li style={{ marginBottom: '0.5rem' }}>Store layout templates (Fresh-First, Food Safety, Perimeter-First) for optimal shopping organization</li>
                            <li style={{ marginBottom: '0.5rem' }}>Hide/show categories for personalized shopping lists based on individual shopping needs</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced search with collapsible sections optimized for mobile devices</li>
                            <li style={{ marginBottom: '0.5rem' }}>Mobile-first design with optimized touch targets and responsive spacing</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced meal completion with extra ingredient tracking and UPC lookup integration</li>
                            <li style={{ marginBottom: '0.5rem' }}>Smart suggestions for partial-use items (spices, oils, condiments) during cooking</li>
                            <li style={{ marginBottom: '0.5rem' }}>Seamless inventory integration with real-time updates during meal completion</li>
                            <li style={{ marginBottom: '0.5rem' }}>Improved voice input with better Android app selection guidance and error handling</li>
                            <li style={{ marginBottom: '0.5rem' }}>Non-blocking success messages and enhanced user workflow optimization</li>
                            <li style={{ marginBottom: '0.5rem' }}>Fixed currency symbol positioning and improved mobile price tracking interface</li>
                            <li style={{ marginBottom: '0.5rem' }}>Responsive modal sizing for all screen sizes (iPhone SE to large Android devices)</li>
                            <li style={{ marginBottom: '0.5rem' }}>Fixed search bar icon alignment and positioning across all mobile devices</li>
                            <li style={{ marginBottom: '0.5rem' }}>Optimized button layouts and spacing for enhanced mobile accessibility</li>
                            <li style={{ marginBottom: '0.5rem' }}>Single-row footer controls for better mobile navigation and usability</li>
                            <li style={{ marginBottom: '0.5rem' }}>Added missing Tailwind CSS utilities for consistent styling and performance</li>
                            <li style={{ marginBottom: '0.5rem' }}>Code cleanup and performance improvements across category management system</li>
                            <li>Enhanced category management with comprehensive movement options and mobile optimization</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#fff3cd', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #ffc107' }}>
                        <h3 style={{ fontSize: '18px', color: '#856404', marginBottom: '1rem' }}>Version 1.4.1 - International Compliance & UI Improvements</h3>
                        <ul style={{ color: '#856404', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Full GDPR compliance with explicit consent management and data protection rights tracking</li>
                            <li style={{ marginBottom: '0.5rem' }}>COPPA-compliant minor protection with parental consent verification system</li>
                            <li style={{ marginBottom: '0.5rem' }}>Multi-jurisdictional privacy compliance (US, EU, UK, Canada, Australia)</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced international user registration with country-specific legal requirements</li>
                            <li style={{ marginBottom: '0.5rem' }}>Granular feature consent for voice processing, international transfers, and data usage</li>
                            <li style={{ marginBottom: '0.5rem' }}>Complete compliance audit trails with consent history and user rights management</li>
                            <li style={{ marginBottom: '0.5rem' }}>Fixed voice input modal positioning and improved mobile accessibility</li>
                            <li style={{ marginBottom: '0.5rem' }}>Improved emoji placement and visual consistency across all UI components</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced barcode scanner visual feedback and error handling</li>
                            <li style={{ marginBottom: '0.5rem' }}>Optimized recipe scaling interface with better mobile responsiveness</li>
                            <li style={{ marginBottom: '0.5rem' }}>Minor bug fixes in nutrition dashboard calculations and display formatting</li>
                            <li>Improved accessibility features and keyboard navigation throughout the application</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#d1ecf1', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #17a2b8' }}>
                        <h3 style={{ fontSize: '18px', color: '#0c5460', marginBottom: '1rem' }}>Version 1.4.0 - International Support & AI Recipe Scaling</h3>
                        <ul style={{ color: '#0c5460', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>International barcode support for 80+ countries with EAN-8, EAN-13, UPC-A, and GTIN-14 format recognition</li>
                            <li style={{ marginBottom: '0.5rem' }}>Regional database integration with Open Food Facts (UK/EU/Global) and intelligent country detection via GS1 prefixes</li>
                            <li style={{ marginBottom: '0.5rem' }}>AI-powered recipe scaling with intelligent handling of seasonings, leavening agents, and aromatics</li>
                            <li style={{ marginBottom: '0.5rem' }}>US ⟷ Metric unit conversion with context-aware measurements and cultural adaptations</li>
                            <li style={{ marginBottom: '0.5rem' }}>Currency-aware optimization for 40+ international currencies with regional shopping preferences</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced barcode scanner with automatic format detection, country origin analysis, and regional warnings</li>
                            <li style={{ marginBottom: '0.5rem' }}>Smart recipe conversion with cooking method adjustments, pan size recommendations, and time modifications</li>
                            <li style={{ marginBottom: '0.5rem' }}>International category mapping (UK "Biscuits" vs US "Cookies") with regional product prioritization</li>
                            <li style={{ marginBottom: '0.5rem' }}>Multi-language support with proper Accept-Language headers and localized product searches</li>
                            <li style={{ marginBottom: '0.5rem' }}>Practical measurement suggestions converting awkward amounts to usable equivalents</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced nutrition analysis integration with automatic recalculation for scaled and converted recipes</li>
                            <li>Regional recipe adaptation system for different countries with local ingredient availability and cultural preferences</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#f8d7da', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #dc3545' }}>
                        <h3 style={{ fontSize: '18px', color: '#721c24', marginBottom: '1rem' }}>Version 1.3.1 - Voice Intelligence & Nutrition Dashboard</h3>
                        <ul style={{ color: '#721c24', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Voice nutrition analysis with natural language processing for instant ingredient insights</li>
                            <li style={{ marginBottom: '0.5rem' }}>Comprehensive nutrition intelligence dashboard with AI-powered analytics and recommendations</li>
                            <li style={{ marginBottom: '0.5rem' }}>Smart inventory optimization with waste reduction and cost-saving suggestions</li>
                            <li style={{ marginBottom: '0.5rem' }}>AI-generated recipe suggestions based on current inventory with smart matching</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced nutrition goals tracking with progress visualization and personalized recommendations</li>
                            <li style={{ marginBottom: '0.5rem' }}>Smart shopping list generation with budget optimization and intelligent cost estimation</li>
                            <li style={{ marginBottom: '0.5rem' }}>Mobile-optimized nutrition dashboard with responsive navigation and touch-friendly interface</li>
                            <li>Voice navigation for quick access to recipe suggestions and optimization features</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#e2e3e5', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #6c757d' }}>
                        <h3 style={{ fontSize: '18px', color: '#383d41', marginBottom: '1rem' }}>Version 1.3.0 - Enhanced User Experience</h3>
                        <ul style={{ color: '#383d41', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Shopping list totals and budget management with price tracking</li>
                            <li style={{ marginBottom: '0.5rem' }}>Professional printing functionality for shopping lists</li>
                            <li style={{ marginBottom: '0.5rem' }}>Advanced recipe collection search and filtering</li>
                            <li style={{ marginBottom: '0.5rem' }}>Improved inventory status system with "Good" replacing "Fresh"</li>
                            <li style={{ marginBottom: '0.5rem' }}>Recipe photo management and upload capabilities</li>
                            <li style={{ marginBottom: '0.5rem' }}>Recipe scaling functionality for different serving sizes</li>
                            <li>Meal planning templates for recurring meal plans</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#d4edda', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
                        <h3 style={{ fontSize: '18px', color: '#155724', marginBottom: '1rem' }}>Version 1.2.0 - Mobile & Admin Features</h3>
                        <ul style={{ color: '#155724', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Mobile share integration for direct recipe imports from social media apps</li>
                            <li style={{ marginBottom: '0.5rem' }}>Comprehensive admin dashboard with user management capabilities</li>
                            <li style={{ marginBottom: '0.5rem' }}>Automated email notification system for account changes</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced AI analysis with visual fallback for silent videos</li>
                            <li>Mobile-first recipe importing experience</li>
                        </ul>
                    </div>
                </section>

                {/* About the Creator Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '2rem' }}>About the Creator</h2>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '2rem',
                            marginRight: '0'
                        }}>
                            <div style={{
                                width: '200px',
                                height: '200px',
                                borderRadius: '50%',
                                backgroundColor: '#e9ecef',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem auto',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                border: '4px solid #f8f9fa',
                                overflow: 'hidden'
                            }}>
                                <img
                                        alt="Edward McKeown Picture"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: '50%'
                                        }}
                                        src="/icons/edmckeown.jpg"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                />
                                <span style={{
                                    fontSize: '24px',
                                    color: '#6c757d',
                                    display: 'none'
                                }}>👨‍🍳</span>
                            </div>
                            <h3 style={{fontSize: '20px', color: '#2c3e50', marginBottom: '0.5rem'}}>Dr. Edward McKeown</h3>
                            <p style={{ fontSize: '16px', color: '#7f8c8d', fontStyle: 'italic', margin: '0' }}>
                                U.S. Marine Corps Veteran<br/>
                                Founder & Creator
                            </p>
                        </div>

                        <div style={{
                            flex: 1,
                            maxWidth: '800px',
                            textAlign: 'left'
                        }}>
                            <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                                Dr. Edward McKeown, a United States Marine Corps veteran, is the founder and creator of Doc Bear's Comfort Kitchen application. Born in Mexico, Missouri, Dr. McKeown brings over 30 years of experience in hospitality management, food safety, and business operations to this innovative AI-powered platform.
                            </p>

                            <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                                Dr. McKeown's unique educational journey spans decades of continuous learning. He began at Pima Community College in 1996, earning his Associate's degree in General Studies with an emphasis on culinary arts, plus a certificate in Hotel Food & Beverage Management. He continued at the University of Nevada, Las Vegas, earning his Bachelor's (2006) and Master's (2008) degrees in Hotel Administration, followed by his Ph.D. in Hospitality and Tourism Management from Purdue University in 2014.
                            </p>

                            <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                                Making a career pivot toward technology, Dr. McKeown is currently pursuing dual degrees in Computer Software Development and Web Application Development at Kirkwood Community College, along with certifications in Java Programming and .NET Programming. This unique combination of hospitality expertise, food safety knowledge, and advanced technical skills enables him to create AI-powered solutions that truly serve both food enthusiasts and home cooks.
                            </p>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#fff3cd', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
                        <h3 style={{ fontSize: '18px', color: '#856404', marginBottom: '1rem' }}>Professional Background</h3>
                        <p style={{ color: '#856404', fontSize: '15px', marginBottom: '1rem' }}>
                            Throughout his career, Dr. McKeown has worked with major companies including Waffle House, Hilton Hotels, The Flamingo Hotel and Casino, Burger King, and Popeye's Chicken. He is a certified ServSafe Food Protection Manager and Instructor and holds multiple certifications in food safety and responsible alcohol service training.
                        </p>
                        <p style={{ color: '#856404', fontSize: '15px', marginBottom: '1rem' }}>
                            As an active member of Kirkwood's Veterans' Association, Dr. McKeown continues to support fellow veterans in their educational and career transitions. He's also known in his community for occasionally donning the red suit to play Santa for special needs children, demonstrating his commitment to giving back to those who need extra support.
                        </p>
                        <p style={{ color: '#856404', fontSize: '15px', margin: '0' }}>
                            Dr. McKeown is also the author of the "Doc Bear's Comfort Food Survival Guide" cookbook series and operates Doc Bear Enterprises, where he provides food safety training and certification services. He's a certified BBQ judge through the Kansas City BBQ Society and has published research papers on food safety and hospitality management.
                        </p>
                    </div>
                </section>

                {/* Mission Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>Our Mission</h2>
                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Doc Bear's Comfort Kitchen was born from a simple belief: managing your home food inventory and meal planning should be simple, efficient, and enjoyable. By combining intelligent inventory tracking with AI-powered recipe discovery, advanced store category management, enhanced meal completion tracking, social media integration, voice nutrition intelligence, comprehensive nutritional analysis dashboard, international barcode support, intelligent recipe scaling tools, and full international compliance, we're helping families worldwide reduce food waste, save money, and discover new culinary adventures using ingredients they already have at home.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Our platform bridges the gap between what's in your pantry and what's on your dinner table, while leveraging cutting-edge AI technology to extract recipes from your favorite social media cooking videos, provide instant voice-activated nutrition insights, intelligently scale recipes for any serving size, organize your shopping with customizable store layouts, track meal completion with smart ingredient additions, and ensure full compliance with international privacy regulations including GDPR and COPPA. Whether you're a busy parent trying to plan the week's meals, a college student learning to cook, or a food enthusiast looking to make the most of your ingredients, our comprehensive application provides all the AI-powered tools you need to succeed in the kitchen and beyond.
                    </p>

                    <div style={{ backgroundColor: '#d1ecf1', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #17a2b8' }}>
                        <h3 style={{ fontSize: '18px', color: '#0c5460', marginBottom: '1rem' }}>Why Doc Bear's Comfort Kitchen?</h3>
                        <ul style={{ color: '#0c5460', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Organize your shopping with customizable store category layouts and drag & drop functionality</li>
                            <li style={{ marginBottom: '0.5rem' }}>Track meal completion with smart ingredient additions and UPC lookup integration</li>
                            <li style={{ marginBottom: '0.5rem' }}>Import recipes instantly from TikTok, Instagram, Facebook, and YouTube videos using advanced AI technology</li>
                            <li style={{ marginBottom: '0.5rem' }}>Scan barcodes from 80+ countries with automatic format detection and regional database optimization</li>
                            <li style={{ marginBottom: '0.5rem' }}>Scale recipes intelligently with AI-powered adjustments for seasonings, leavening agents, and cooking methods</li>
                            <li style={{ marginBottom: '0.5rem' }}>Convert between US and metric measurements with context-aware cultural adaptations</li>
                            <li style={{ marginBottom: '0.5rem' }}>Get instant nutrition information using voice commands with natural language processing</li>
                            <li style={{ marginBottom: '0.5rem' }}>Access comprehensive nutrition intelligence dashboard with AI-powered optimization recommendations</li>
                            <li style={{ marginBottom: '0.5rem' }}>Ensure full privacy compliance with GDPR, COPPA, and multi-jurisdictional data protection</li>
                            <li style={{ marginBottom: '0.5rem' }}>Reduce food waste by tracking expiration dates and using ingredients efficiently with smart suggestions</li>
                            <li style={{ marginBottom: '0.5rem' }}>Save money by planning meals around what you already have with intelligent inventory matching and international currency support</li>
                            <li style={{ marginBottom: '0.5rem' }}>Discover new recipes that match your available ingredients with percentage-based matching and scaling options</li>
                            <li style={{ marginBottom: '0.5rem' }}>Streamline shopping with intelligent list generation, price tracking, and budget alerts in your local currency</li>
                            <li style={{ marginBottom: '0.5rem' }}>Access 650+ trusted recipes from the Doc Bear's Comfort Food Survival Guide series</li>
                            <li style={{ marginBottom: '0.5rem' }}>Make informed dietary choices with comprehensive nutritional analysis and goal tracking</li>
                            <li style={{ marginBottom: '0.5rem' }}>Simplify meal planning with flexible weekly templates and multi-week planning capabilities</li>
                            <li style={{ marginBottom: '0.5rem' }}>Share content seamlessly from mobile apps with native social media integration</li>
                            <li>Track comprehensive nutrition data including calories, macros, vitamins, and minerals for optimal health management across different regions</li>
                        </ul>
                    </div>
                </section>

                {/* Technology Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>Built with Advanced AI & Modern Technology</h2>
                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Our application is built using cutting-edge web technologies including React for a responsive, intuitive user interface, combined with advanced artificial intelligence for recipe extraction, voice recognition, intelligent recipe scaling, nutritional analysis, store category management, meal completion tracking, and full international compliance management. The platform leverages machine learning algorithms to process video content from social media platforms, extracting recipes through both audio narration analysis and visual cooking step recognition, while providing instant voice-activated nutrition insights, intelligent recipe conversions, comprehensive data protection features, and intuitive store organization tools.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        The platform is designed to work seamlessly across all devices and is currently available as a Progressive Web App (PWA), allowing for offline access and app-like functionality on mobile devices. Our mobile-first approach includes native sharing integration, allowing users to share videos directly from social media apps to Doc Bear's recipe extractor, voice-activated features for hands-free nutrition analysis, international barcode scanning capabilities, optimized touch interfaces for store category management, enhanced meal completion workflows, and robust privacy compliance features. Native mobile apps for Google Play Store and Apple App Store are coming soon.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px' }}>
                        We integrate with reliable international nutritional databases including Open Food Facts (UK/EU/Global), USDA databases, AI-powered food recognition systems, comprehensive UPC databases covering 80+ countries, advanced voice processing technology, and international compliance frameworks (GDPR, COPPA, etc.) to provide accurate information while respecting intellectual property rights and protecting user privacy. Our advanced AI systems, receipt processing capabilities, voice nutrition analysis, international barcode support, recipe scaling intelligence, store category organization features, meal completion tracking, social media integration capabilities, and comprehensive compliance management make it easy to build your inventory and recipe collection quickly and efficiently while discovering new culinary inspirations from your favorite creators worldwide, all while ensuring your data is protected according to the highest international standards.
                    </p>
                </section>

                {/* Contact Section */}
                <section style={{
                    backgroundColor: '#f8f9fa',
                    padding: '2rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>Get in Touch</h2>
                    <p style={{ color: '#666', fontSize: '16px', marginBottom: '1.5rem' }}>
                        Have questions, suggestions, or feedback about Doc Bear's Comfort Kitchen? We'd love to hear from you!
                    </p>
                    <div style={{ color: '#666', fontSize: '16px' }}>
                        <p><strong>Doc Bear Enterprises, LLC.</strong></p>
                        <p>5249 N Park Pl NE, PMB 4011<br/>Cedar Rapids, IA 52402</p>
                        <p>Phone: (319) 826-3463</p>
                        <p>
                            Email: <a href="mailto:privacy@docbearscomfort.kitchen" style={{ color: '#e74c3c', textDecoration: 'none' }}>privacy@docbearscomfort.kitchen</a><br/>
                            Website: <a href="https://docbearscomfort.kitchen" target="_blank" rel="noopener noreferrer" style={{ color: '#e74c3c', textDecoration: 'none' }}>docbearscomfort.kitchen</a>
                        </p>
                    </div>
                </section>

                {/* Footer Note */}
                <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                    <p style={{ color: '#6c757d', fontSize: '14px', textAlign: 'center', margin: '0' }}>
                        Doc Bear's Comfort Kitchen - Making home cooking easier with AI-powered innovation, one recipe at a time. 🍳🤖🌍⚖️🎤🔒🏪
                    </p>
                </div>
            </div>
    );
};

export default AboutUs;