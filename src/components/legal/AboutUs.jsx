// file: src/components/legal/AboutUs.jsx v1.8.0 - Native iOS Integration for Apple App Store Approval, Enhanced Recipe Discovery with Advanced Sorting, iOS Launch, Form Improvements, and Bug Fixes

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
                            🍎 Now featuring complete native iOS integration for Apple App Store approval, enhanced recipe discovery with advanced sorting options, multi-part recipe management, superior recipe search and discovery system, comprehensive image integration, cross-platform optimization for web/PWA/mobile, enhanced shopping list management, advanced store category management, meal completion with UPC lookup, voice input, international barcode support, AI-powered recipe scaling, and full international compliance with GDPR & COPPA!
                        </p>
                    </div>
                </div>

                {/* About the Application Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>About Our Application</h2>
                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Doc Bear's Comfort Kitchen is a comprehensive, AI-powered web application designed to revolutionize how you manage your home food inventory and discover delicious recipes. Our platform seamlessly combines intelligent inventory tracking with advanced recipe matching, multi-part recipe management, enhanced recipe discovery system with advanced sorting capabilities, comprehensive image integration, AI-powered social media recipe extraction, voice nutrition analysis, comprehensive nutritional intelligence dashboard, advanced store category management, enhanced meal completion tracking, international barcode support, intelligent recipe scaling, cross-platform optimization, native iOS integration for Apple App Store approval, and full international compliance, making meal planning easier and more efficient than ever before.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Whether you're creating complex multi-part recipes with separate sections for fillings and toppings, discovering recipes through our enhanced search system with advanced sorting options (featured, random, relevance, highest rated, quickest, newest, most reviews), browsing our beautiful image-rich recipe collection, organizing your shopping with customizable store category layouts, completing meals with smart ingredient additions and UPC lookup, scanning international UPC codes from 80+ countries, scaling recipes with AI-powered intelligence, manually entering food items, importing recipes from TikTok videos, asking for nutrition information with voice commands, or exploring our extensive database of over 650 public recipes from the acclaimed "Doc Bear's Comfort Food Survival Guide" cookbook series, our application helps you make the most of what you have while discovering new culinary adventures. The intelligent recipe matching system automatically suggests meals you can make with your current inventory, handles complex multi-part recipes, provides detailed nutritional analysis, smart optimization recommendations, and even suggests recipes that are just a few ingredients away from completion.
                    </p>

                    <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0' }}>
                        <h3 style={{ fontSize: '20px', color: '#2c3e50', marginBottom: '1rem' }}>Comprehensive Features</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🍎 Native iOS Integration for Apple App Store</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                                    <strong>Native Mobile Integration:</strong> Share content directly from social media apps to Doc Bear's recipe extractor on mobile devices.
                                </p>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                                    <strong>Cross-Platform Promotion:</strong> App store badges work on web, PWA can promote native apps for seamless transitions.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Version History Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>Recent Updates</h2>

                    <div style={{ backgroundColor: '#e8f5e8', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #28a745' }}>
                        <h3 style={{ fontSize: '18px', color: '#155724', marginBottom: '1rem' }}>Version 1.8.0 (Latest) - Complete Native iOS Integration for Apple App Store</h3>
                        <ul style={{ color: '#155724', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Complete native iOS integration replacing all web browser behaviors for Apple App Store approval</li>
                            <li style={{ marginBottom: '0.5rem' }}>Native iOS navigation with swipe-to-go-back gestures and platform-appropriate transitions</li>
                            <li style={{ marginBottom: '0.5rem' }}>Native iOS dialogs replacing all web alerts with action sheets, alert controllers, and modal presentations</li>
                            <li style={{ marginBottom: '0.5rem' }}>Native iOS barcode scanner using AVFoundation with haptic feedback and enhanced camera integration</li>
                            <li style={{ marginBottom: '0.5rem' }}>System-integrated haptic feedback throughout the entire application for enhanced user experience</li>
                            <li style={{ marginBottom: '0.5rem' }}>Native iOS form components with platform-appropriate keyboard types and input validation</li>
                            <li style={{ marginBottom: '0.5rem' }}>Cross-platform compatibility maintained - all web, PWA, and Android functionality preserved</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced error handling with graceful fallbacks for all native iOS components</li>
                            <li style={{ marginBottom: '0.5rem' }}>Improved mobile responsiveness and touch interface optimization</li>
                            <li style={{ marginBottom: '0.5rem' }}>Performance optimizations for native iOS features and smooth cross-platform operation</li>
                            <li>iOS app updated to v1.8.0 with complete native integration ready for Apple App Store resubmission</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#fff3cd', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #ffc107' }}>
                        <h3 style={{ fontSize: '18px', color: '#856404', marginBottom: '1rem' }}>Version 1.7.0 - Enhanced Recipe Discovery & iOS Launch</h3>
                        <ul style={{ color: '#856404', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced recipe discovery with advanced sorting options: Featured, Random, Relevance, Highest Rated, Quickest, Newest, and Most Reviews</li>
                            <li style={{ marginBottom: '0.5rem' }}>iOS App Store launch (v1.0.0) with full feature parity and native iOS integration</li>
                            <li style={{ marginBottom: '0.5rem' }}>Android app updated to version 1.7.0 with enhanced performance and new sorting features</li>
                            <li style={{ marginBottom: '0.5rem' }}>Improved user registration with automatic form clearing after successful account creation</li>
                            <li style={{ marginBottom: '0.5rem' }}>Comprehensive bug fixes and patches for enhanced stability and performance</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced recipe browsing experience with intelligent sort algorithms for better recipe discovery</li>
                            <li style={{ marginBottom: '0.5rem' }}>Fixed minor UI inconsistencies and improved responsive design across all platforms</li>
                            <li style={{ marginBottom: '0.5rem' }}>Optimized database queries for faster recipe loading and sorting performance</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced error handling and user feedback throughout the application</li>
                            <li style={{ marginBottom: '0.5rem' }}>Improved mobile app performance with optimized memory usage and faster navigation</li>
                            <li>Cross-platform consistency improvements ensuring identical experience across web, PWA, Android, and iOS</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#d1ecf1', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #17a2b8' }}>
                        <h3 style={{ fontSize: '18px', color: '#0c5460', marginBottom: '1rem' }}>Version 1.6.0 - Multi-Part Recipes & Superior User Experience</h3>
                        <ul style={{ color: '#0c5460', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Revolutionary multi-part recipe system supporting complex recipes with multiple sections (Filling, Topping, etc.)</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced recipe form with tabbed interface for managing recipe parts independently</li>
                            <li style={{ marginBottom: '0.5rem' }}>Smart text parsing that automatically detects and creates multi-part recipes from pasted text</li>
                            <li style={{ marginBottom: '0.5rem' }}>Unified landing page strategy with consistent branding across web, PWA, Android, and iOS platforms</li>
                            <li style={{ marginBottom: '0.5rem' }}>Superior recipe discovery system with advanced filtering, natural language search, and real-time results</li>
                            <li style={{ marginBottom: '0.5rem' }}>Rich recipe cards with ratings, reviews, nutrition info, tags, and beautiful image integration</li>
                            <li style={{ marginBottom: '0.5rem' }}>Comprehensive image management system with hero images, click-to-enlarge, and attribution tracking</li>
                            <li style={{ marginBottom: '0.5rem' }}>Interactive recipe detail pages with dynamic serving adjustment and ingredient checkboxes</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced shopping list management with multi-part recipe support and improved category matching</li>
                            <li style={{ marginBottom: '0.5rem' }}>New shopping list features including item removal and better category organization</li>
                            <li style={{ marginBottom: '0.5rem' }}>Updated "What Can I Make?" functionality to include multi-part recipes in suggestions</li>
                            <li style={{ marginBottom: '0.5rem' }}>Voice input support for each part of multi-part recipes with intelligent section recognition</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced recipe scaling that works across all parts of complex multi-part recipes</li>
                            <li style={{ marginBottom: '0.5rem' }}>Improved mobile responsiveness with better touch interfaces and optimized layouts</li>
                            <li style={{ marginBottom: '0.5rem' }}>Cross-platform optimization ensuring consistent experience across all devices and platforms</li>
                            <li style={{ marginBottom: '0.5rem' }}>Advanced recipe parser with intelligent section detection and multi-part recipe creation</li>
                            <li style={{ marginBottom: '0.5rem' }}>Database schema enhancements to support multi-part recipes while maintaining backward compatibility</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enhanced API routes supporting creation and editing of multi-part recipes</li>
                            <li style={{ marginBottom: '0.5rem' }}>Comprehensive nutrition analysis across all parts of multi-part recipes</li>
                            <li>Performance improvements and code optimization for better user experience across all features</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#f8d7da', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #dc3545' }}>
                        <h3 style={{ fontSize: '18px', color: '#721c24', marginBottom: '1rem' }}>Version 1.5.0 - Advanced Store Management & Enhanced User Experience</h3>
                        <ul style={{ color: '#721c24', fontSize: '15px', marginLeft: '1.5rem' }}>
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

                    <div style={{ backgroundColor: '#e2e3e5', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #6c757d' }}>
                        <h3 style={{ fontSize: '18px', color: '#383d41', marginBottom: '1rem' }}>Version 1.4.1 - International Compliance & UI Improvements</h3>
                        <ul style={{ color: '#383d41', fontSize: '15px', marginLeft: '1.5rem' }}>
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

                    <div style={{ backgroundColor: '#d4edda', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #28a745' }}>
                        <h3 style={{ fontSize: '18px', color: '#155724', marginBottom: '1rem' }}>Version 1.4.0 - International Support & AI Recipe Scaling</h3>
                        <ul style={{ color: '#155724', fontSize: '15px', marginLeft: '1.5rem' }}>
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

                    <div style={{ backgroundColor: '#fff3cd', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #ffc107' }}>
                        <h3 style={{ fontSize: '18px', color: '#856404', marginBottom: '1rem' }}>Version 1.3.1 - Voice Intelligence & Nutrition Dashboard</h3>
                        <ul style={{ color: '#856404', fontSize: '15px', marginLeft: '1.5rem' }}>
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

                    <div style={{ backgroundColor: '#d1ecf1', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #17a2b8' }}>
                        <h3 style={{ fontSize: '18px', color: '#0c5460', marginBottom: '1rem' }}>Version 1.2.0 - Mobile & Admin Features</h3>
                        <ul style={{ color: '#0c5460', fontSize: '15px', marginLeft: '1.5rem' }}>
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
                        Doc Bear's Comfort Kitchen was born from a simple belief: managing your home food inventory and meal planning should be simple, efficient, and enjoyable. By combining intelligent inventory tracking with AI-powered recipe discovery, multi-part recipe management, enhanced recipe discovery with advanced sorting capabilities, comprehensive image integration, advanced store category management, enhanced meal completion tracking, social media integration, voice nutrition intelligence, comprehensive nutritional analysis dashboard, international barcode support, intelligent recipe scaling tools, cross-platform optimization, native iOS integration for seamless Apple App Store experience, and full international compliance, we're helping families worldwide reduce food waste, save money, and discover new culinary adventures using ingredients they already have at home.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Our platform bridges the gap between what's in your pantry and what's on your dinner table, while leveraging cutting-edge AI technology to extract recipes from your favorite social media cooking videos, create complex multi-part recipes with separate sections for fillings and toppings, provide enhanced recipe discovery with beautiful image-rich cards and advanced sorting options, provide instant voice-activated nutrition insights, intelligently scale recipes for any serving size, organize your shopping with customizable store layouts, track meal completion with smart ingredient additions, ensure consistent experience across web, PWA, Android, and iOS platforms with native iOS integration for authentic Apple ecosystem experience, and ensure full compliance with international privacy regulations including GDPR and COPPA. Whether you're a busy parent trying to plan the week's meals, a college student learning to cook, or a food enthusiast looking to make the most of your ingredients, our comprehensive application provides all the AI-powered tools you need to succeed in the kitchen and beyond.
                    </p>

                    <div style={{ backgroundColor: '#d1ecf1', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #17a2b8' }}>
                        <h3 style={{ fontSize: '18px', color: '#0c5460', marginBottom: '1rem' }}>Why Doc Bear's Comfort Kitchen?</h3>
                        <ul style={{ color: '#0c5460', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Experience authentic native iOS integration with platform-appropriate navigation, dialogs, and user interface elements</li>
                            <li style={{ marginBottom: '0.5rem' }}>Create and manage complex multi-part recipes with separate sections for fillings, toppings, and more</li>
                            <li style={{ marginBottom: '0.5rem' }}>Discover recipes through enhanced search system with advanced sorting options (Featured, Random, Relevance, Highest Rated, Quickest, Newest, Most Reviews)</li>
                            <li style={{ marginBottom: '0.5rem' }}>Browse beautiful image-rich recipe collection with advanced filtering and comprehensive image integration</li>
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
                            <li style={{ marginBottom: '0.5rem' }}>Discover new recipes that match your available ingredients including complex multi-part recipes with percentage-based matching</li>
                            <li style={{ marginBottom: '0.5rem' }}>Streamline shopping with intelligent list generation, price tracking, and budget alerts in your local currency</li>
                            <li style={{ marginBottom: '0.5rem' }}>Access 650+ trusted recipes including multi-part recipes from the Doc Bear's Comfort Food Survival Guide series</li>
                            <li style={{ marginBottom: '0.5rem' }}>Make informed dietary choices with comprehensive nutritional analysis and goal tracking</li>
                            <li style={{ marginBottom: '0.5rem' }}>Simplify meal planning with flexible weekly templates and multi-week planning capabilities</li>
                            <li style={{ marginBottom: '0.5rem' }}>Share content seamlessly from mobile apps with native social media integration</li>
                            <li>Experience consistent branding and functionality across web, PWA, Android (v1.7.0), and iOS (v1.8.0) platforms</li>
                        </ul>
                    </div>
                </section>

                {/* Technology Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>Built with Advanced AI & Modern Technology</h2>
                        <p style={{ color: '#444', fontSize: '14px', marginBottom: '0.5rem' }}>
                            <strong>Native iOS Navigation:</strong> Platform-appropriate navigation patterns with swipe-to-go-back gestures and iOS-style transitions.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Native iOS Dialogs:</strong> Replaced all web alerts with native iOS action sheets, alert controllers, and modal presentations.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Native iOS Barcode Scanner:</strong> AVFoundation-powered camera scanning with haptic feedback and iOS-optimized UI.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Native iOS Haptic Feedback:</strong> System-integrated haptic feedback throughout the app for enhanced user experience.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>iOS Form Components:</strong> Native iOS keyboard types, input validation, and form handling for authentic iOS experience.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🔍 Enhanced Recipe Discovery with Advanced Sorting</h4>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Multiple Sort Options:</strong> Sort recipes by Featured, Random, Relevance, Highest Rated, Quickest, Newest, and Most Reviews for perfect discovery.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Advanced Search & Filtering:</strong> Natural language search with category, difficulty, time, and dietary restriction filters.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Rich Recipe Cards:</strong> Beautiful cards with ratings, reviews, nutrition info, tags, and author information.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Quick Browse Categories:</strong> One-click category filters for fast recipe discovery and exploration.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>Smart Recommendations:</strong> AI-powered related recipe suggestions based on your preferences and inventory.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🧩 Multi-Part Recipe Management</h4>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Complex Recipe Support:</strong> Create recipes with multiple sections like "Filling" and "Topping" for dishes like Chicken Pot Pie.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Tabbed Interface:</strong> Manage each recipe part independently with its own ingredients, instructions, and timing.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Smart Text Parsing:</strong> Automatically detect and parse multi-part recipes from text with intelligent section recognition.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Flexible Display:</strong> View parts in tabs or sequential "show all parts" mode for cooking workflow.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>Backward Compatible:</strong> All existing single-part recipes continue to work seamlessly without changes.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🎨 Enhanced Landing Page & UX</h4>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Unified Cross-Platform Design:</strong> Consistent branding and experience across web, PWA, Android, and iOS platforms.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Interactive Elements:</strong> Floating animations, glass effects, and micro-interactions for engaging user experience.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Better Navigation:</strong> Improved navigation with Recipes and Pricing links for superior user flow.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Social Proof Integration:</strong> Statistics section with glass effects showcasing platform success.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>Mobile-First Approach:</strong> Responsive design optimized for all devices with progressive enhancement.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📸 Comprehensive Image Integration</h4>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Recipe Image Management:</strong> Upload, display, and manage recipe images with fallback handling.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Hero Image Display:</strong> Large hero images with click-to-enlarge functionality and full-screen modal.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Image Attribution:</strong> Proper photo credit information with source tracking and visual indicators.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Performance Optimized:</strong> Next.js Image component with proper optimization and loading states.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>User Photo Support:</strong> Indicators for user-uploaded photos vs stock images with proper handling.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🛒 Enhanced Shopping List Management</h4>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Advanced Category Matching:</strong> Improved logic for matching ingredients to store categories with better accuracy.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Multi-Part Recipe Support:</strong> Generate shopping lists from complex multi-part recipes with consolidated ingredients.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Item Removal Feature:</strong> Remove unneeded items from shopping lists with easy management interface.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>New Categories Added:</strong> Expanded category system with better organization and matching algorithms.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>Smart List Generation:</strong> Intelligent shopping list creation from "What Can I Make?" suggestions including multi-part recipes.
                        </p>
                    </div>

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
                            <strong>Multi-Part Recipe Scaling:</strong> Scale complex multi-part recipes with intelligent adjustments for each section.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>US ⟷ Metric Conversion:</strong> Context-aware conversions between US standard and metric measurements with cultural adaptations.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Cooking Method Adjustments:</strong> Provides intelligent suggestions for cooking time, pan sizes, and equipment changes for scaled recipes.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>Practical Measurements:</strong> Converts awkward measurements to practical equivalents (e.g., "7.3 eggs" becomes "7 eggs + 1 egg white").
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
                            <strong>Multi-Part Recipe Support:</strong> Voice input for each part of multi-part recipes with intelligent section recognition.
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
                            <strong>Multi-Part Recipe Detection:</strong> Automatically detect and parse multi-part recipes from social media content.
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
                            <strong>Multi-Part Recipe Analysis:</strong> Comprehensive nutrition analysis across all parts of complex recipes.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Inventory Optimization:</strong> Smart suggestions to reduce waste, save money, and improve nutrition with actionable recommendations.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Recipe Suggestions:</strong> AI-generated recipe recommendations based on your current inventory with smart insights.
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
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>Complete Item Management:</strong> Edit items to add brand names, expiration dates, multiple storage locations, price tracking, and detailed notes.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>👨‍🍳 Enhanced Recipe Discovery & Management</h4>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Extensive Recipe Database:</strong> Access to over 650 public recipes, including multi-part recipes from the Doc Bear's Comfort Food Survival Guide cookbook series.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Advanced Recipe Search:</strong> Search your recipe collection by title, ingredients, categories, or cooking methods with intelligent filtering.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>"What Can I Make?" Intelligence:</strong> Advanced recipe matching based on your current inventory including multi-part recipes with percentage-based matching.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Interactive Recipe Details:</strong> Dynamic serving adjustment, ingredient checkboxes, step-by-step instructions with timing.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>Recipe Review System:</strong> Star ratings, comments, helpful votes, and chef's notes for community engagement.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📱 Cross-Platform Access & Native Apps</h4>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Unified Platform Strategy:</strong> Consistent experience across web, PWA, Android (v1.7.0), and iOS (v1.8.0) with unified landing page.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Progressive Web App (PWA):</strong> Full PWA functionality with app-like experience, offline capabilities, and mobile-first design.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Native Mobile Apps:</strong> Available in Google Play Store (Android) and Apple App Store (iOS) with native share integration.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 0.5rem 0' }}>
                            <strong>Native Mobile Integration:</strong> Share content directly from social media apps to Doc Bear's recipe extractor on mobile devices.
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                            <strong>Cross-Platform Promotion:</strong> App store badges work on web, PWA can promote native apps for seamless transitions.
                        </p>
                    </div>
                </section>

    {/* Technology Section */}
    <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>Built with Advanced AI & Modern Technology</h2>
        <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
            Our application is built using cutting-edge web technologies including React for a responsive, intuitive user interface, combined with advanced artificial intelligence for recipe extraction, multi-part recipe management, enhanced recipe discovery with intelligent sorting algorithms, comprehensive image integration, voice recognition, intelligent recipe scaling, nutritional analysis, store category management, meal completion tracking, cross-platform optimization, and full international compliance management. The platform leverages machine learning algorithms to process video content from social media platforms, extracting recipes through both audio narration analysis and visual cooking step recognition, while providing instant voice-activated nutrition insights, intelligent recipe conversions, comprehensive data protection features, intuitive store organization tools, beautiful image-rich recipe experiences, advanced recipe sorting and discovery capabilities, and seamless multi-part recipe creation and management.
        </p>

        <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
            The platform is designed to work seamlessly across all devices and is available as a Progressive Web App (PWA), native Android app (v1.7.0), and native iOS app (v1.0.0), allowing for offline access and app-like functionality on mobile devices. Our unified cross-platform approach includes consistent branding and user experience across web, PWA, Android, and iOS platforms, native sharing integration allowing users to share videos directly from social media apps to Doc Bear's recipe extractor, voice-activated features for hands-free nutrition analysis, international barcode scanning capabilities, optimized touch interfaces for store category management, enhanced meal completion workflows, comprehensive image management with hero images and attribution tracking, advanced multi-part recipe creation and editing capabilities, intelligent recipe sorting and discovery features, and robust privacy compliance features.
        </p>

        <p style={{ color: '#444', fontSize: '16px' }}>
            We integrate with reliable international nutritional databases including Open Food Facts (UK/EU/Global), USDA databases, AI-powered food recognition systems, comprehensive UPC databases covering 80+ countries, advanced voice processing technology, comprehensive image processing and management systems, intelligent recipe sorting and recommendation algorithms, and international compliance frameworks (GDPR, COPPA, etc.) to provide accurate information while respecting intellectual property rights and protecting user privacy. Our advanced AI systems, multi-part recipe parsing capabilities, enhanced recipe discovery algorithms with intelligent sorting, comprehensive image integration features, receipt processing capabilities, voice nutrition analysis, international barcode support, recipe scaling intelligence, store category organization features, meal completion tracking, social media integration capabilities, cross-platform optimization tools, and comprehensive compliance management make it easy to build your inventory and recipe collection quickly and efficiently while discovering new culinary inspirations from your favorite creators worldwide, all while ensuring your data is protected according to the highest international standards.
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
            Doc Bear's Comfort Kitchen - Making home cooking easier, one recipe at a time.<br/><br/> 🧩🍳🤖🌍⚖️🎤🔒🏪📸🔍
        </p>
    </div>
</div>
);
};

export default AboutUs;