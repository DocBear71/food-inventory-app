// file: src/components/legal/PrivacyPolicy.jsx v2 - Updated with voice input and international features

import React from 'react';

const PrivacyPolicy = () => {
    return (
            <div className="privacy-container" style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '20px 40px',
                lineHeight: '1.6',
                fontFamily: 'Arial, sans-serif'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '26px', color: '#000000', marginBottom: '10px' }}>
                        PRIVACY POLICY
                    </h1>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Last updated July 25, 2025</strong>
                    </p>
                </div>

                <div style={{ marginBottom: '2rem', backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '8px', border: '2px solid #2196f3' }}>
                    <p style={{ fontSize: '16px', color: '#1565c0', margin: '0', fontWeight: 'bold' }}>
                        🌍 Now featuring voice input capabilities, international barcode support for 80+ countries, AI-powered recipe scaling, and comprehensive price tracking with multi-currency support!
                    </p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        This Privacy Notice for <strong>Doc Bear Enterprises, LLC.</strong> ("<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>"), describes how and why we might access, collect, store, use, and/or share ("<strong>process</strong>") your personal information when you use our services ("<strong>Services</strong>"), including when you:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Visit our website at <a href="https://docbearscomfort.kitchen" target="_blank" rel="noopener noreferrer" style={{ color: '#3030F1' }}>https://docbearscomfort.kitchen</a>, or any website of ours that links to this Privacy Notice</li>
                        <li>Use our Doc Bear's Comfort Kitchen application for food inventory management, recipe discovery, voice input, international barcode scanning, price tracking, and AI-powered recipe scaling</li>
                        <li>Engage with us in other related ways, including any sales, marketing, or events</li>
                    </ul>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <strong>privacy@docbearscomfort.kitchen</strong>.
                    </p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>SUMMARY OF KEY POINTS</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.</em></strong>
                    </p>

                    <div style={{ marginTop: '1rem' }}>
                        <p style={{ color: '#595959', fontSize: '15px' }}>
                            <strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with our international food inventory and recipe management application, the choices you make, and the products and features you use, including voice input, barcode scanning, price tracking, and AI-powered recipe scaling.
                        </p>

                        <p style={{ color: '#595959', fontSize: '15px' }}>
                            <strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information. Voice input is processed locally in your browser and not stored on our servers.
                        </p>

                        <p style={{ color: '#595959', fontSize: '15px' }}>
                            <strong>Do we collect any information from third parties?</strong> We may collect limited information from third-party recipe sources, international nutritional databases (including Open Food Facts for 80+ countries), price comparison services, and process public video content using AI services when you use our recipe import and video extraction features.
                        </p>

                        <p style={{ color: '#595959', fontSize: '15px' }}>
                            <strong>How do we process your information?</strong> We process your information to provide, improve, and administer our international food inventory and recipe management Services, communicate with you, for security and fraud prevention, to comply with law, and to provide voice input, barcode scanning, price tracking, and AI-powered scaling features.
                        </p>

                        <p style={{ color: '#595959', fontSize: '15px' }}>
                            <strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information, including your food inventory data, personal recipes, price tracking information, and voice input processing safeguards.
                        </p>

                        <p style={{ color: '#595959', fontSize: '15px' }}>
                            <strong>Do we collect information from minors?</strong> We welcome users 13 years of age and older with appropriate parental consent for users under 18. We comply with COPPA and GDPR requirements and implement special protections for all users under 18, including additional safeguards for voice input features.
                        </p>

                        <p style={{ color: '#595959', fontSize: '15px' }}>
                            <strong>What are your privacy rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Parents and guardians have additional rights regarding their children's data, including control over voice input permissions.
                        </p>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>TABLE OF CONTENTS</h2>
                    <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
                        <div><a href="#infocollect" style={{ color: '#3030F1', textDecoration: 'none' }}>1. WHAT INFORMATION DO WE COLLECT?</a></div>
                        <div><a href="#infouse" style={{ color: '#3030F1', textDecoration: 'none' }}>2. HOW DO WE PROCESS YOUR INFORMATION?</a></div>
                        <div><a href="#whoshare" style={{ color: '#3030F1', textDecoration: 'none' }}>3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a></div>
                        <div><a href="#voice-input" style={{ color: '#3030F1', textDecoration: 'none' }}>4. VOICE INPUT FEATURE</a></div>
                        <div><a href="#international-features" style={{ color: '#3030F1', textDecoration: 'none' }}>5. INTERNATIONAL FEATURES AND DATA SOURCES</a></div>
                        <div><a href="#ai-processing" style={{ color: '#3030F1', textDecoration: 'none' }}>6. AI PROCESSING OF PUBLIC VIDEO CONTENT</a></div>
                        <div><a href="#price-tracking" style={{ color: '#3030F1', textDecoration: 'none' }}>7. PRICE TRACKING AND MULTI-CURRENCY SUPPORT</a></div>
                        <div><a href="#cookies" style={{ color: '#3030F1', textDecoration: 'none' }}>8. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</a></div>
                        <div><a href="#inforetain" style={{ color: '#3030F1', textDecoration: 'none' }}>9. HOW LONG DO WE KEEP YOUR INFORMATION?</a></div>
                        <div><a href="#infosafe" style={{ color: '#3030F1', textDecoration: 'none' }}>10. HOW DO WE KEEP YOUR INFORMATION SAFE?</a></div>
                        <div><a href="#infominors" style={{ color: '#3030F1', textDecoration: 'none' }}>11. DO WE COLLECT INFORMATION FROM MINORS?</a></div>
                        <div><a href="#privacyrights" style={{ color: '#3030F1', textDecoration: 'none' }}>12. WHAT ARE YOUR PRIVACY RIGHTS?</a></div>
                        <div><a href="#contact" style={{ color: '#3030F1', textDecoration: 'none' }}>13. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a></div>
                    </div>
                </div>

                <div id="infocollect" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>1. WHAT INFORMATION DO WE COLLECT?</h2>
                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Personal information you disclose to us</h3>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We collect personal information that you provide to us when using our international food inventory and recipe management application with voice input, barcode scanning, price tracking, and AI-powered scaling capabilities.</em>
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Personal Information Provided by You.</strong> The personal information that we collect may include the following:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>names</li>
                        <li>email addresses</li>
                        <li>usernames</li>
                        <li>passwords</li>
                        <li>food inventory data</li>
                        <li>custom recipes and meal plans</li>
                        <li>shopping lists and price tracking information</li>
                        <li>dietary preferences and restrictions</li>
                        <li>contact information for sharing lists</li>
                        <li>international currency and regional preferences</li>
                        <li>voice command preferences and settings</li>
                        <li>barcode scanning history and product data</li>
                    </ul>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Application Data.</strong> We may also collect data related to your use of our food inventory application, including:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>International UPC codes and product information you scan or enter from 80+ countries</li>
                        <li>Recipe searches, preferences, and AI-powered scaling data</li>
                        <li>Meal planning data and templates</li>
                        <li>Price tracking information and multi-currency preferences</li>
                        <li>Usage patterns within the application</li>
                        <li>Voice input settings and preferences (but not voice recordings)</li>
                        <li>Regional and localization preferences</li>
                    </ul>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Sensitive Information.</strong> We do not process sensitive information.
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.
                    </p>
                </div>

                <div id="infouse" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>2. HOW DO WE PROCESS YOUR INFORMATION?</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We process your information to provide, improve, and administer our international food inventory and recipe management Services with voice input, barcode scanning, price tracking, and AI-powered scaling capabilities.</em>
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</strong>
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li><strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong> We may process your information so you can create and log in to your account, as well as keep your account in working order.</li>
                        <li><strong>To deliver and facilitate delivery of services to the user.</strong> We may process your information to provide you with the requested service, including managing your international food inventory, suggesting recipes with AI-powered scaling, price tracking, voice input processing, and creating meal plans.</li>
                        <li><strong>To process voice input commands.</strong> We may temporarily process voice-to-text results to understand your inventory commands and search requests.</li>
                        <li><strong>To provide international barcode scanning.</strong> We may process UPC codes and product identifiers to retrieve product information from international databases.</li>
                        <li><strong>To enable price tracking features.</strong> We may process price information and currency preferences to provide price tracking and budget management features.</li>
                        <li><strong>To respond to user inquiries/offer support to users.</strong> We may process your information to respond to your inquiries and solve any potential issues you might have with the requested service.</li>
                        <li><strong>To send administrative information to you.</strong> We may process your information to send you details about our products and services, changes to our terms and policies, and other similar information.</li>
                        <li><strong>To enable user-to-user communications.</strong> We may process your information if you choose to use any of our offerings that allow for communication with another user, such as sharing shopping lists via email.</li>
                        <li><strong>To protect our Services.</strong> We may process your information as part of our efforts to keep our Services safe and secure, including fraud monitoring and prevention.</li>
                        <li><strong>To evaluate and improve our Services, products, marketing, and your experience.</strong> We may process your information when we believe it is necessary to identify usage trends, determine the effectiveness of our promotional campaigns, and to evaluate and improve our Services, products, marketing, and your experience.</li>
                        <li><strong>To identify usage trends.</strong> We may process information about how you use our Services to better understand how they are being used so we can improve them.</li>
                        <li><strong>To comply with our legal obligations.</strong> We may process your information to comply with our legal obligations, respond to legal requests, and exercise, establish, or defend our legal rights.</li>
                    </ul>
                </div>

                <div id="whoshare" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We may share information in specific situations described in this section and/or with the following third parties.</em>
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        We may need to share your personal information in the following situations:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
                        <li><strong>When we use third-party nutritional databases.</strong> We may share your information with certain third-party nutritional data providers to enhance the accuracy of nutritional information in our application.</li>
                        <li><strong>With your consent.</strong> We may disclose your personal information for any other purpose with your consent.</li>
                    </ul>
                </div>

                <div id="voice-input" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>4. VOICE INPUT FEATURE</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>When you use voice input features, your voice is processed locally in your browser and we do not record, store, or transmit audio files.</em>
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Voice Input Processing:</strong> Our Services include voice input functionality that allows you to add inventory items and search your collection using voice commands.
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>How Voice Input Works</h3>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li><strong>Local Processing:</strong> Voice-to-text conversion happens entirely in your browser using your device's built-in speech recognition</li>
                        <li><strong>No Recording:</strong> We do not record, store, or transmit audio files</li>
                        <li><strong>No Audio Storage:</strong> Audio is processed in real-time and immediately discarded</li>
                        <li><strong>Text Results Only:</strong> Only the resulting text from speech recognition is temporarily used to process your inventory commands</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Your Control Over Voice Features</h3>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Microphone access is entirely optional</li>
                        <li>You can deny permission and use all app features through text input</li>
                        <li>You can revoke microphone permission at any time through your browser settings</li>
                        <li>The app will function fully without microphone access</li>
                        <li>Voice input settings can be disabled in your profile preferences</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Third-Party Voice Processing</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Voice-to-text conversion is handled by your browser's native speech recognition service, which may be provided by your operating system or browser vendor (such as Google's speech recognition service for Chrome browsers). Please refer to your browser's and operating system's privacy policies for information about how they handle voice data.
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Additional Protections for Minors</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        For users under 18, we implement additional safeguards for voice input features, including parental controls and the ability for parents to disable voice features entirely for their child's account.
                    </p>
                </div>

                <div id="international-features" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>5. INTERNATIONAL FEATURES AND DATA SOURCES</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We access international databases and services to provide barcode scanning, product information, and regional optimization for 80+ countries.</em>
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>International Barcode Support</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Our Services support international barcode formats (EAN-8, EAN-13, UPC-A, GTIN-14) and integrate with multiple international databases:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li><strong>Open Food Facts:</strong> We access product information from Open Food Facts databases (UK/EU/Global) for international product recognition</li>
                        <li><strong>USDA Database:</strong> We use USDA nutritional information for US-based products</li>
                        <li><strong>Regional Databases:</strong> We may access other regional food databases to provide accurate product information for your location</li>
                        <li><strong>GS1 Prefix Analysis:</strong> We analyze barcode prefixes to determine product origin and optimize regional searches</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Multi-Currency and Regional Support</h3>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>We store your preferred currency and regional settings</li>
                        <li>Price tracking information may be converted between currencies using third-party exchange rate services</li>
                        <li>Regional preferences help us prioritize relevant databases and product information</li>
                        <li>Localization preferences are stored to provide appropriate cultural adaptations</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Data Sharing with International Services</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        When you scan international barcodes or request product information, we may share UPC codes and product identifiers with international databases. We do not share your personal information, only the product codes necessary to retrieve product details.
                    </p>
                </div>

                <div id="ai-processing" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>6. AI PROCESSING OF PUBLIC VIDEO CONTENT</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>When you provide public video URLs for recipe extraction, we may process this content using third-party AI services that use the data to improve their models.</em>
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Video Recipe Extraction:</strong> Our Services include a feature that allows you to extract recipes from public cooking videos (such as YouTube videos). When you use this feature:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>You provide us with URLs to publicly available cooking videos</li>
                        <li>We process the video content (including transcripts and visual elements) using third-party AI services, including OpenAI</li>
                        <li>The extracted recipe information becomes part of your personal recipe collection</li>
                    </ul>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>AI Service Data Sharing:</strong> To provide enhanced recipe extraction capabilities and reduce service costs, we participate in OpenAI's content sharing program. This means:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Public video content we process may be used by OpenAI to improve their AI models</li>
                        <li>Only publicly available video content is shared, never your personal recipes or private data</li>
                        <li>This sharing enables us to offer video extraction as a free feature</li>
                        <li>We only share content that is already publicly accessible on platforms like YouTube</li>
                    </ul>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>What We Do NOT Share:</strong> We never share your personal information, custom recipes, food inventory data, or any content you create or input privately with AI services for training purposes.
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Your Rights:</strong> By using our video recipe extraction feature, you acknowledge and consent to this processing of public video content. If you prefer not to use this feature, you can always add recipes manually or use our text-based recipe parser.
                    </p>
                </div>

                <div id="price-tracking" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>7. PRICE TRACKING AND MULTI-CURRENCY SUPPORT</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We collect and store price information you provide and may use third-party services for currency conversion and market data.</em>
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Price Information Collection</h3>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>We store price information you manually enter for inventory items</li>
                        <li>We track price history and trends for your personal use</li>
                        <li>We may store store names and locations you associate with prices</li>
                        <li>We calculate averages and trends based on your price data</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Currency Conversion and Market Data</h3>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>We may use third-party currency conversion services to display prices in your preferred currency</li>
                        <li>We may access market data services to provide price comparison features</li>
                        <li>Currency preferences and regional settings are stored in your profile</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Price Data Privacy</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Your price tracking information is kept private and is not shared with third parties except for the currency conversion and market data services necessary to provide the features. We do not sell or share your spending patterns or price data with retailers or marketing companies.
                    </p>
                </div>

                <div id="cookies" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>8. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We may use cookies and other tracking technologies to collect and store your information.</em>
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements, to tailor advertisements to your interests, or to send abandoned shopping cart reminders (depending on your communication preferences).
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.
                    </p>
                </div>

                <div id="inforetain" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>9. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.</em>
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.
                    </p>
                </div>

                <div id="infosafe" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>10. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We aim to protect your personal information through a system of organizational and technical security measures.</em>
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.
                    </p>
                </div>

                <div id="infominors" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>11. DO WE COLLECT INFORMATION FROM MINORS?</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>We welcome users 13 years of age and older. Users under 18 must have verifiable parental consent. We comply with COPPA and GDPR requirements for all users under 18, including special protections for voice input features.</em>
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Age Requirements and Parental Consent</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Our Services are intended for users who are 13 years of age or older. Users between 13 and 17 years of age must have verifiable parental or guardian consent before using our Services. By using the Services, users under 18 represent that they have obtained proper parental consent for their use of the Services.
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Special Protections for Voice Input</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        For users under 18, we implement additional safeguards for voice input features:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Parents can disable voice input features entirely for their child's account</li>
                        <li>Voice features require explicit parental consent in addition to general app consent</li>
                        <li>We provide clear instructions to parents about how voice input works and privacy protections</li>
                        <li>Parents can monitor their child's use of voice features through parental controls</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Limited Data Collection for Minors</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        When users under 18 use our Services, we limit data collection to what is necessary for the functioning of our food inventory and recipe management features. We do not:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Collect more personal information than is reasonably necessary for the user to participate in our Services</li>
                        <li>Use behavioral advertising or targeted marketing directed at users under 18</li>
                        <li>Share personal information of users under 18 with third parties for marketing purposes</li>
                        <li>Allow public sharing of personal information by users under 18</li>
                        <li>Store voice recordings or audio data from users under 18</li>
                        <li>Enable advanced price tracking features that might reveal spending patterns for users under 16</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Parental Rights and Controls</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Parents and guardians of users under 18 have the right to:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Review the personal information we have collected from their child</li>
                        <li>Request that we delete their child's personal information</li>
                        <li>Refuse to permit further collection or use of their child's information</li>
                        <li>Request information about our data practices regarding their child's account</li>
                        <li>Control their child's access to voice input features</li>
                        <li>Monitor their child's use of international features and price tracking</li>
                        <li>Set restrictions on currency and regional settings</li>
                    </ul>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        To exercise these rights, parents may contact us at <strong>privacy@docbearscomfort.kitchen</strong> with appropriate verification of their parental status.
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Safe and Educational Content</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        All content within our Services, including recipes, nutritional information, and meal planning features, is appropriate for users of all ages in our target demographic. Our content focuses on educational cooking and nutrition topics that promote healthy lifestyle habits.
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>International Compliance</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        We also comply with international privacy regulations including the EU General Data Protection Regulation (GDPR) Article 8, which provides additional protections for users under 16 in EU member states. Where applicable local laws provide greater protection for minors, we comply with those standards.
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        If you become aware of any data we may have collected from children without proper consent, or if you have questions about our practices regarding minor users, please contact us immediately at <strong>privacy@docbearscomfort.kitchen</strong>.
                    </p>
                </div>

                <div id="privacyrights" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>12. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.</em>
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Withdrawing your consent</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Account Information</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        If you would at any time like to review or change the information in your account or terminate your account, you can:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Log in to your account settings and update your user account.</li>
                    </ul>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Cookies and similar technologies</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Services.
                    </p>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        If you have questions or comments about your privacy rights, you may email us at <strong>privacy@docbearscomfort.kitchen</strong>.
                    </p>
                </div>

                // Add this section to your Privacy Policy after Section 12 (Privacy Rights)

                <div id="gdpr-rights" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>13. ADDITIONAL RIGHTS FOR EU/EEA USERS</h2>
                    <p style={{ color: '#595959', fontSize: '15px', fontStyle: 'italic' }}>
                        <strong><em>In Short:</em></strong> <em>If you are located in the European Union or European Economic Area, you have additional rights regarding your personal data under the General Data Protection Regulation (GDPR).</em>
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Legal Basis for Processing</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        We process your personal data under the following legal bases:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li><strong>Consent:</strong> For voice input features, marketing communications, and optional data processing</li>
                        <li><strong>Contract Performance:</strong> To provide our food inventory and recipe management services</li>
                        <li><strong>Legitimate Interest:</strong> To improve our services, prevent fraud, and ensure security</li>
                        <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Your GDPR Rights</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        Under GDPR, you have the following rights regarding your personal data:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li><strong>Right of Access:</strong> Request copies of your personal data</li>
                        <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
                        <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your personal data</li>
                        <li><strong>Right to Restrict Processing:</strong> Request limitation of processing under certain circumstances</li>
                        <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                        <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
                        <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for voice input or other consent-based processing</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>International Data Transfers</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        When you use international barcode scanning or AI recipe scaling features, your data may be processed by services located outside the EU/EEA. We ensure adequate protection through:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>EU Standard Contractual Clauses with third-party processors</li>
                        <li>Adequacy decisions by the European Commission where applicable</li>
                        <li>Other appropriate safeguards as required by GDPR</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Data Protection Officer</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        For GDPR-related inquiries, you may contact our Data Protection Officer at: <strong>dpo@docbearscomfort.kitchen</strong>
                    </p>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Supervisory Authority</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        You have the right to lodge a complaint with your local data protection supervisory authority if you believe your rights under GDPR have been violated.
                    </p>
                </div>

                <div id="contact" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>14. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        If you have questions or comments about this notice, you may email us at <strong>privacy@docbearscomfort.kitchen</strong> or contact us by post at:
                    </p>
                    <div style={{ color: '#595959', fontSize: '15px', marginTop: '1rem' }}>
                        <div><strong>Doc Bear Enterprises, LLC.</strong></div>
                        <div></div>
                        <div>Cedar Rapids, IA </div>
                        <div>United States</div>
                        <div>privacy@docbearscomfort.kitchen</div>
                    </div>
                </div>

                <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                    <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', margin: '0' }}>
                        This privacy policy is specifically tailored for Doc Bear's Comfort Kitchen application and its food inventory management features, including voice input, international barcode support, AI-powered recipe scaling, and comprehensive price tracking capabilities.
                    </p>
                </div>
            </div>
    );
};

export default PrivacyPolicy;