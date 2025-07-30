// file: src/components/legal/TermsOfUse.jsx v3 - Updated with voice input and international features

import React from 'react';

const TermsOfUse = () => {
    return (
            <div className="terms-container" style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '20px 40px',
                lineHeight: '1.6',
                fontFamily: 'Arial, sans-serif',
            }}>
                <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                    <h1 style={{fontSize: '26px', color: '#000000', marginBottom: '10px'}}>
                        TERMS OF USE
                    </h1>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        <strong>Last updated July 25, 2025</strong>
                    </p>
                </div>

                <div style={{ marginBottom: '2rem', backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '8px', border: '2px solid #2196f3' }}>
                    <p style={{ fontSize: '16px', color: '#1565c0', margin: '0', fontWeight: 'bold' }}>
                        🌍 Updated terms covering voice input capabilities, international barcode support for 80+ countries, AI-powered recipe scaling, and comprehensive price tracking features!
                    </p>
                </div>

                <div style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>TABLE OF CONTENTS</h2>
                    <div style={{fontSize: '15px', lineHeight: '1.8'}}>
                        <div><a href="#services" style={{color: '#3030F1', textDecoration: 'none'}}>1. OUR SERVICES</a></div>
                        <div><a href="#ip" style={{color: '#3030F1', textDecoration: 'none'}}>2. INTELLECTUAL PROPERTY RIGHTS</a></div>
                        <div><a href="#userreps" style={{color: '#3030F1', textDecoration: 'none'}}>3. USER REPRESENTATIONS</a></div>
                        <div><a href="#prohibited" style={{color: '#3030F1', textDecoration: 'none'}}>4. PROHIBITED ACTIVITIES</a></div>
                        <div><a href="#voice-terms" style={{color: '#3030F1', textDecoration: 'none'}}>5. VOICE INPUT TERMS</a></div>
                        <div><a href="#international-terms" style={{color: '#3030F1', textDecoration: 'none'}}>6. INTERNATIONAL FEATURES AND BARCODE SCANNING</a></div>
                        <div><a href="#price-tracking-terms" style={{color: '#3030F1', textDecoration: 'none'}}>7. PRICE TRACKING AND CURRENCY FEATURES</a></div>
                        <div><a href="#ai-scaling-terms" style={{color: '#3030F1', textDecoration: 'none'}}>8. AI-POWERED RECIPE SCALING</a></div>
                        <div><a href="#ugc" style={{color: '#3030F1', textDecoration: 'none'}}>9. USER GENERATED CONTRIBUTIONS</a></div>
                        <div><a href="#license" style={{color: '#3030F1', textDecoration: 'none'}}>10. CONTRIBUTION LICENSE</a></div>
                        <div><a href="#management" style={{color: '#3030F1', textDecoration: 'none'}}>11. SERVICES MANAGEMENT</a></div>
                        <div><a href="#terms" style={{color: '#3030F1', textDecoration: 'none'}}>12. TERM AND TERMINATION</a></div>
                        <div><a href="#modifications" style={{color: '#3030F1', textDecoration: 'none'}}>13. MODIFICATIONS AND INTERRUPTIONS</a></div>
                        <div><a href="#law" style={{color: '#3030F1', textDecoration: 'none'}}>14. GOVERNING LAW</a></div>
                        <div><a href="#disputes" style={{color: '#3030F1', textDecoration: 'none'}}>15. DISPUTE RESOLUTION</a></div>
                        <div><a href="#corrections" style={{color: '#3030F1', textDecoration: 'none'}}>16. CORRECTIONS</a></div>
                        <div><a href="#disclaimer" style={{color: '#3030F1', textDecoration: 'none'}}>17. DISCLAIMER</a></div>
                        <div><a href="#liability" style={{color: '#3030F1', textDecoration: 'none'}}>18. LIMITATIONS OF LIABILITY</a></div>
                        <div><a href="#indemnification" style={{color: '#3030F1', textDecoration: 'none'}}>19. INDEMNIFICATION</a></div>
                        <div><a href="#userdata" style={{color: '#3030F1', textDecoration: 'none'}}>20. USER DATA</a></div>
                        <div><a href="#electronic" style={{color: '#3030F1', textDecoration: 'none'}}>21. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</a></div>
                        <div><a href="#misc" style={{color: '#3030F1', textDecoration: 'none'}}>22. MISCELLANEOUS</a></div>
                        <div><a href="#contact" style={{color: '#3030F1', textDecoration: 'none'}}>23. CONTACT US</a></div>
                    </div>
                </div>

                <div id="services" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>1. OUR SERVICES</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Our Services include comprehensive food inventory management, recipe discovery with AI-powered
                        scaling, international barcode scanning for 80+ countries, voice input capabilities, price
                        tracking with multi-currency support, and meal planning features. The information provided
                        when using the Services is not intended for distribution to or use by any person or entity
                        in any jurisdiction or country where such distribution or use would be contrary to law or
                        regulation or which would subject us to any registration requirement within such jurisdiction
                        or country. Accordingly, those persons who choose to access the Services from other locations
                        do so on their own initiative and are solely responsible for compliance with local laws,
                        if and to the extent local laws are applicable.
                    </p>
                </div>

                <div id="ip" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>2. INTELLECTUAL PROPERTY RIGHTS</h2>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Our intellectual property</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        We are the owner or the licensee of all intellectual property rights in our Services, including all
                        source code, databases, functionality, software, website designs, audio, video, text, photographs,
                        and graphics in the Services (collectively, the "Content"), as well as the trademarks, service
                        marks, and logos contained therein (the "Marks"). Our Content and Marks are protected by copyright
                        and trademark laws (and various other intellectual property rights and unfair competition laws) and
                        treaties around the world. The Content and Marks are provided in or through the Services "AS IS"
                        for your personal, non-commercial use or internal business purpose only.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Your use of our Services</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Subject to your compliance with these Legal Terms, including the "PROHIBITED ACTIVITIES" section below,
                        we grant you a non-exclusive, non-transferable, revocable license to:
                    </p>
                    <ol style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>access the Services; and</li>
                        <li>download or print a copy of any portion of the Content to which you have properly gained
                            access, solely for your personal, non-commercial use or internal business purpose.
                        </li>
                    </ol>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Except as set out in this section or elsewhere in our Legal Terms, no part of the Services and
                        no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted,
                        publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise
                        exploited for any commercial purpose whatsoever, without our express prior written permission.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        If you wish to make any use of the Services, Content, or Marks other than as set out in this
                        section or elsewhere in our Legal Terms, please address your request to:
                        privacy@docbearscomfort.kitchen. If we ever grant you the permission to post, reproduce, or publicly
                        display any part of our Services or Content, you must identify us as the owners or licensors of
                        the Services, Content, or Marks and ensure that any copyright or proprietary notice appears or
                        is visible on posting, reproducing, or displaying our Content.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        We reserve all rights not expressly granted to you in and to the Services, Content, and Marks.
                        Any breach of these Intellectual Property Rights will constitute a material breach of our Legal
                        Terms and your right to use our Services will terminate immediately.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Your submissions and user data</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        <strong>Your Food Data:</strong> You retain ownership of your personal food inventory data,
                        custom recipes, meal plans, and shopping lists. However, by using our Services, you grant us a
                        license to store, process, and display this information as necessary to provide the Services to
                        you.
                    </p>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        <strong>Recipe Submissions:</strong> If you submit original recipes to our platform, you warrant
                        that you own the rights to such recipes and grant us permission to include them in our recipe
                        database for other users to discover and use.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        <strong>Submissions:</strong> By directly sending us any question, comment, suggestion, idea,
                        feedback, or other information about the Services ("Submissions"), you agree to assign to us all
                        intellectual property rights in such Submission. You agree that we shall own this Submission and be
                        entitled to its unrestricted use and dissemination for any lawful purpose, commercial or otherwise,
                        without acknowledgment or compensation to you.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        <strong>You are responsible for what you post or upload:</strong> By sending us Submissions through
                        any part of the Services you:
                    </p>
                    <ol style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>confirm that you have read and agree with our "PROHIBITED ACTIVITIES" and will not post,
                            send, publish, upload, or transmit through the Services any Submission that is illegal, harassing,
                            hateful, harmful, defamatory, obscene, bullying, abusive, discriminatory, threatening to any
                            person or group, sexually explicit, false, inaccurate, deceitful, or misleading;
                        </li>
                        <li>warrant that you have the necessary rights and licenses to submit such Submissions and that
                            you have full authority to grant us the above-mentioned rights in relation to your Submissions;
                        </li>
                        <li>to the extent permissible by applicable law, waive any and all moral rights to any such
                            Submission;
                        </li>
                        <li>warrant that any such Submission are original to you or that you have the necessary rights
                            and licenses to submit such Submissions; and
                        </li>
                        <li>warrant and represent that your Submissions do not constitute confidential information.</li>
                    </ol>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        You are solely responsible for your Submissions and you expressly agree to reimburse us for any and
                        all losses that we may suffer because of your breach of (a) this section, (b) any third party's
                        intellectual property rights, or (c) applicable law.
                    </p>
                </div>

                <div id="userreps" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>3. USER REPRESENTATIONS</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        By using the Services, you represent and warrant that:
                    </p>
                    <ol style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>you have the legal capacity and you agree to comply with these Legal Terms;</li>
                        <li>if you are between 13 and 17 years of age, you have obtained verifiable parental or guardian consent to use the Services;</li>
                        <li>if you are under 13 years of age, you may not use the Services;</li>
                        <li>if you are a parent or guardian providing consent for a minor, you agree to be bound by these Legal Terms on behalf of the minor;</li>
                        <li>you will not access the Services through automated or non-human means, whether through a bot, script or otherwise;</li>
                        <li>you will not use the Services for any illegal or unauthorized purpose;</li>
                        <li>your use of the Services will not violate any applicable law or regulation;</li>
                        <li>any recipes you submit are original or you have proper rights to share them;</li>
                        <li>you will not input false or misleading food inventory information that could affect the safety or accuracy of meal planning features;</li>
                        <li>if you are under 18, you will not share personal information beyond what is necessary for the Services to function;</li>
                        <li>you understand that all content in the Services is appropriate for users 13 years of age and older;</li>
                        <li><strong>you understand that voice input is processed locally in your browser and you consent to microphone access when using voice features;</strong></li>
                        <li><strong>you will not attempt to record or capture other users' voice interactions;</strong></li>
                        <li><strong>you will provide accurate price information when using price tracking features;</strong></li>
                        <li><strong>you understand that international barcode scanning may access third-party databases and you consent to sharing product codes for identification purposes;</strong></li>
                        <li><strong>you will not use AI recipe scaling features to create content that infringes on others' intellectual property rights.</strong></li>
                    </ol>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Services (or any portion thereof). For users under 18, we will also notify the parent or guardian who provided consent.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Parental Responsibilities for New Features</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Parents and guardians who provide consent for minors to use the Services agree to:
                    </p>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>Monitor their child's use of the Services, including voice input and price tracking features;</li>
                        <li>Ensure their child complies with these Legal Terms;</li>
                        <li>Take responsibility for any violations of these Terms by their child;</li>
                        <li>Contact us immediately if they wish to terminate their child's account or have concerns about their child's use of the Services;</li>
                        <li><strong>Control their child's access to voice input features and understand how voice processing works;</strong></li>
                        <li><strong>Supervise their child's use of price tracking features and understand that pricing information may be shared with the child;</strong></li>
                        <li><strong>Ensure their child has appropriate supervision when using international barcode scanning features.</strong></li>
                    </ul>
                </div>

                <div id="prohibited" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>4. PROHIBITED ACTIVITIES</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        You may not access or use the Services for any purpose other than that for which we make the Services available. As a user of the Services, you agree not to:
                    </p>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>Systematically retrieve data or other content from the Services to create or compile a collection, compilation, database, or directory of recipes or food data without written permission;</li>
                        <li>Submit false or misleading food inventory information that could impact food safety or dietary recommendations;</li>
                        <li>Upload or share recipes that you do not own the rights to or that infringe on others' intellectual property;</li>
                        <li>Provide video URLs to content you do not have the right to process or that violates the terms of the video platform;</li>
                        <li>Use the Services to promote or sell food products or services without authorization;</li>
                        <li>Attempt to reverse engineer our recipe recommendation algorithms or nutritional calculation methods;</li>
                        <li>Share your account credentials with others or create multiple accounts;</li>
                        <li>Use the Services in any way that could disable, overburden, or impair the functionality of our food database or recipe matching features;</li>
                        <li>Upload content that contains allergen information that is knowingly false or misleading;</li>
                        <li><strong>Attempt to record, store, or transmit voice input from other users;</strong></li>
                        <li><strong>Use voice input features to input inappropriate, offensive, or harmful content;</strong></li>
                        <li><strong>Attempt to bypass microphone permission requirements or access voice features without proper consent;</strong></li>
                        <li><strong>Submit false or misleading price information that could affect other users' budgeting decisions;</strong></li>
                        <li><strong>Attempt to manipulate price tracking algorithms or create artificial price trends;</strong></li>
                        <li><strong>Use international barcode scanning to identify products for purposes other than personal inventory management;</strong></li>
                        <li><strong>Attempt to reverse engineer or extract barcode databases or product information for commercial use;</strong></li>
                        <li><strong>Use AI recipe scaling features to create derivative works that infringe on others' copyrighted recipes;</strong></li>
                        <li><strong>Attempt to bypass regional restrictions or access databases not intended for your geographic location;</strong></li>
                        <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords;</li>
                        <li>Circumvent, disable, or otherwise interfere with security-related features of the Services;</li>
                        <li>Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services;</li>
                        <li>Use any information obtained from the Services in order to harass, abuse, or harm another person;</li>
                        <li>Make improper use of our support services or submit false reports of abuse or misconduct;</li>
                        <li>Use the Services in a manner inconsistent with any applicable laws or regulations;</li>
                        <li>Engage in unauthorized framing of or linking to the Services;</li>
                        <li>Upload or transmit viruses, Trojan horses, or other material that interferes with any party's uninterrupted use and enjoyment of the Services;</li>
                        <li>Engage in any automated use of the system, such as using scripts to send comments or messages;</li>
                        <li>Delete the copyright or other proprietary rights notice from any Content;</li>
                        <li>Attempt to impersonate another user or person or use the username of another user;</li>
                        <li>Interfere with, disrupt, or create an undue burden on the Services or the networks or services connected to the Services;</li>
                        <li>Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you;</li>
                        <li>Attempt to bypass any measures of the Services designed to prevent or restrict access to the Services;</li>
                        <li>Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML, JavaScript, or other code;</li>
                        <li>Except as permitted by applicable law, decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Services;</li>
                        <li>Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavor or commercial enterprise.</li>
                    </ul>
                </div>

                <div id="voice-terms" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>5. VOICE INPUT TERMS</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Our Services include voice input functionality that allows you to add inventory items and search your collection using voice commands. By using voice input features, you acknowledge and agree to the following terms:
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Microphone Access and Consent</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>Voice input requires microphone access through your browser</li>
                        <li>You must grant explicit permission for microphone access</li>
                        <li>You can revoke microphone permission at any time through your browser settings</li>
                        <li>All voice processing occurs locally in your browser using your device's speech recognition</li>
                        <li>We do not record, store, or transmit audio files</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Voice Input Accuracy and Limitations</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>Voice recognition accuracy may vary based on your device, browser, and speech patterns</li>
                        <li>You are responsible for reviewing and confirming voice input results before saving</li>
                        <li>Voice input may not work properly in noisy environments or with certain accents</li>
                        <li>You should verify all voice-generated inventory entries for accuracy</li>
                        <li>Voice features require an internet connection for speech recognition processing</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Appropriate Use of Voice Features</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>Use voice input only for legitimate inventory management and search purposes</li>
                        <li>Do not use voice input to enter inappropriate, offensive, or harmful content</li>
                        <li>Respect others' privacy - do not use voice features in settings where others might be overheard</li>
                        <li>For users under 18, adult supervision is recommended when using voice features</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Third-Party Voice Processing</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Voice-to-text conversion is handled by your browser's speech recognition service, which may be provided by third parties such as Google. Your use of voice features is also subject to your browser's and operating system's terms of service and privacy policies.
                    </p>
                </div>

                <div id="international-terms" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>6. INTERNATIONAL FEATURES AND BARCODE SCANNING</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Our Services support international barcode scanning for 80+ countries and integrate with multiple international databases. By using these features, you agree to the following terms:
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Barcode Scanning and Product Recognition</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>We support EAN-8, EAN-13, UPC-A, and GTIN-14 barcode formats</li>
                        <li>Product information is retrieved from third-party databases including Open Food Facts, USDA, and regional databases</li>
                        <li>By scanning barcodes, you consent to sharing product codes with these databases for identification purposes</li>
                        <li>Product information accuracy depends on third-party database quality and may vary by region</li>
                        <li>You are responsible for verifying product information accuracy, especially for allergen and dietary restriction data</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Regional and Currency Features</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>We may automatically detect your region based on your device settings or IP address</li>
                        <li>Regional preferences help us prioritize relevant databases and product information</li>
                        <li>Currency conversion may use third-party exchange rate services</li>
                        <li>Regional product categories and measurements may be adapted for your location</li>
                        <li>You can manually override regional settings in your profile</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>International Data Access</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>We may access international databases to provide accurate product information</li>
                        <li>Some features may not be available in all countries due to data availability or legal restrictions</li>
                        <li>You are responsible for complying with your local laws regarding food inventory and import regulations</li>
                        <li>International features are provided "as-is" and availability may vary</li>
                    </ul>
                </div>

                <div id="price-tracking-terms" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>7. PRICE TRACKING AND CURRENCY FEATURES</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Our Services include price tracking and multi-currency support features. By using these features, you acknowledge and agree to the following terms:
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Price Information Accuracy</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>You are responsible for providing accurate price information when manually entering prices</li>
                        <li>Price trends and averages are calculated based on data you provide</li>
                        <li>We do not guarantee the accuracy of price information or trends</li>
                        <li>Prices may vary by location, store, and time - our data is for reference only</li>
                        <li>You should verify current prices before making purchasing decisions</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Currency Conversion</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>Currency conversion rates are provided by third-party services and may not reflect real-time rates</li>
                        <li>Conversion rates are for reference purposes only and may include fees or margins</li>
                        <li>We are not responsible for losses due to currency fluctuations or conversion inaccuracies</li>
                        <li>You should verify exchange rates independently for financial decisions</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Budget and Financial Features</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>Budget tracking and spending analysis features are for personal reference only</li>
                        <li>We do not provide financial advice or recommendations</li>
                        <li>You are responsible for managing your personal finances and budgets</li>
                        <li>Price tracking data is not intended for commercial or investment purposes</li>
                    </ul>
                </div>

                <div id="ai-scaling-terms" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>8. AI-POWERED RECIPE SCALING</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Our Services include AI-powered recipe scaling that intelligently adjusts recipes for different serving sizes. By using these features, you agree to the following terms:
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Recipe Scaling Accuracy</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>AI recipe scaling provides intelligent suggestions but may not be perfect for all recipes</li>
                        <li>You should review and adjust scaled recipes based on your cooking experience and preferences</li>
                        <li>Complex recipes with specialized techniques may not scale proportionally</li>
                        <li>Cooking times, temperatures, and equipment suggestions are estimates and should be verified</li>
                        <li>You are responsible for food safety when preparing scaled recipes</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Unit Conversion</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>US to metric conversions are provided for convenience but should be verified for precision cooking</li>
                        <li>Regional adaptations may suggest ingredient substitutions based on local availability</li>
                        <li>You should verify conversions and substitutions meet your dietary needs and preferences</li>
                        <li>Cultural adaptations are suggestions only and may not reflect authentic regional practices</li>
                    </ul>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Intellectual Property</h3>
                    <ul style={{color: '#595959', fontSize: '15px', marginLeft: '20px'}}>
                        <li>Scaled recipes remain subject to the original recipe's copyright and licensing terms</li>
                        <li>You may not use AI scaling to create derivative works that infringe on others' rights</li>
                        <li>Commercial use of scaled recipes may require permission from original recipe creators</li>
                        <li>AI-generated scaling suggestions are not copyrightable as original works</li>
                    </ul>
                </div>

                {/* Content Rating and Regional Compliance */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>9. Content Rating and Regional Compliance</h2>

                    <div style={{ backgroundColor: '#e8f5e8', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #28a745' }}>
                        <h3 style={{ fontSize: '18px', color: '#155724', marginBottom: '1rem' }}>Age Rating and Content Classification</h3>
                        <ul style={{ color: '#155724', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Primary Age Rating:</strong> 13+ (suitable for users 13 years and older)</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Content Categories:</strong> Educational cooking content, food inventory management, nutrition information</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Mature Content:</strong> None - All content is family-friendly and educational</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Gambling Elements:</strong> None present in the application</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Simulated Gambling:</strong> Not applicable - no gambling functionality</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#fff3cd', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #ffc107' }}>
                        <h3 style={{ fontSize: '18px', color: '#856404', marginBottom: '1rem' }}>Regional Age Verification Compliance</h3>

                        <h4 style={{ fontSize: '16px', color: '#856404', marginBottom: '0.5rem' }}>Korea (MOGEF Requirements):</h4>
                        <ul style={{ color: '#856404', fontSize: '15px', marginLeft: '1.5rem', marginBottom: '1rem' }}>
                            <li>Our app contains no content designated as "harmful to juveniles"</li>
                            <li>All content is educational and appropriate for users 13+</li>
                            <li>No additional age verification beyond standard registration is required</li>
                        </ul>

                        <h4 style={{ fontSize: '16px', color: '#856404', marginBottom: '0.5rem' }}>Japan (Specified Commercial Transactions Act):</h4>
                        <ul style={{ color: '#856404', fontSize: '15px', marginLeft: '1.5rem', marginBottom: '1rem' }}>
                            <li>Business operator: Doc Bear Enterprises, LLC.</li>
                            <li>Contact phone: (319) 826-3463</li>
                            <li>Physical address: 5249 N Park Pl NE, PMB 4011, Cedar Rapids, IA 52402</li>
                            <li>All required merchant information is maintained in our Play Console account</li>
                        </ul>

                        <h4 style={{ fontSize: '16px', color: '#856404', marginBottom: '0.5rem' }}>Brazil (Merchant Requirements):</h4>
                        <ul style={{ color: '#856404', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li>All required merchant verification information is provided through our Google Payments profile</li>
                            <li>Business documentation available upon regulatory request</li>
                            <li>Compliance with Brazilian commercial transaction requirements</li>
                        </ul>
                    </div>

                    <div style={{ backgroundColor: '#d1ecf1', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #17a2b8' }}>
                        <h3 style={{ fontSize: '18px', color: '#0c5460', marginBottom: '1rem' }}>Content Safety Assurance</h3>
                        <ul style={{ color: '#0c5460', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>All recipes and nutritional content are appropriate for family use</li>
                            <li style={{ marginBottom: '0.5rem' }}>Voice input features include additional safeguards for users under 18</li>
                            <li style={{ marginBottom: '0.5rem' }}>International barcode scanning is limited to food products only</li>
                            <li style={{ marginBottom: '0.5rem' }}>Price tracking features do not contain financial advice or investment guidance</li>
                            <li>Educational focus promotes healthy cooking and nutrition habits</li>
                        </ul>
                    </div>
                </section>

                <div id="ugc" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>10. USER GENERATED CONTRIBUTIONS</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        The Services may invite you to chat, contribute to, or participate in online forums, recipe
                        sharing, meal plan discussions, and other functionality during which you may create, submit,
                        post, display, transmit, perform, publish, distribute, or broadcast content and materials to
                        us or through the Services, including but not limited to text, writings, photographs, graphics,
                        comments, suggestions, recipes, food inventory data, or personal information or other
                        material (collectively, "Contributions").
                    </p>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Contributions may be viewable by other users of the Services. When you create or make
                        available any Contributions, you thereby represent and warrant that your Contributions do not contain
                        any allergen information that is false or could cause harm to individuals with food allergies or
                        dietary restrictions.
                    </p>
                </div>

                <div id="license" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>11. CONTRIBUTION LICENSE</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        You and Services agree that we may access, store, process, and use any information and
                        personal data that you provide and your choices (including settings).
                    </p>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        By submitting suggestions or other feedback regarding the Services, you agree that we can
                        use and share such feedback for any purpose without compensation to you.
                    </p>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        We do not assert any ownership over your Contributions. You retain full ownership of all of
                        your Contributions and any intellectual property rights or other proprietary rights associated
                        with your Contributions. We are not liable for any statements or representations in your
                        Contributions provided by you in any area on the Services. You are solely responsible for
                        your Contributions to the Services and you expressly agree to exonerate us from any and all
                        responsibility and to refrain from any legal action against us regarding your Contributions.
                    </p>
                </div>

                <div id="management" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>12. SERVICES MANAGEMENT</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        We reserve the right, but not the obligation, to: (1) monitor the Services for violations of
                        these Legal Terms; (2) take appropriate legal action against anyone who, in our sole
                        discretion, violates the law or these Legal Terms, including without limitation, reporting such user to
                        law enforcement authorities; (3) in our sole discretion and without limitation, refuse, restrict
                        access to, limit the availability of, or disable (to the extent technologically feasible)
                        any of your Contributions or any portion thereof; (4) in our sole discretion and without
                        limitation, notice, or liability, to remove from the Services or otherwise disable all files and content
                        that are excessive in size or are in any way burdensome to our systems; and (5) otherwise
                        manage the Services in a manner designed to protect our rights and property and to facilitate the
                        proper functioning of the Services.
                    </p>
                </div>

                <div id="terms" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>13. TERM AND TERMINATION</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        These Legal Terms shall remain in full force and effect while you use the Services. WITHOUT
                        LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE
                        DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES
                        (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING
                        WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL
                        TERMS OR OF ANY APPLICABLE LAW OR REGULATION. WE MAY TERMINATE YOUR USE OR PARTICIPATION IN
                        THE SERVICES OR DELETE ANY CONTENT OR INFORMATION THAT YOU POSTED AT ANY TIME, WITHOUT WARNING,
                        IN OUR SOLE DISCRETION.
                    </p>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        If we terminate or suspend your account for any reason, you are prohibited from registering
                        and creating a new account under your name, a fake or borrowed name, or the name of any third
                        party, even if you may be acting on behalf of the third party. In addition to terminating or
                        suspending your account, we reserve the right to take appropriate legal action, including without
                        limitation pursuing civil, criminal, and injunctive redress.
                    </p>
                </div>

                <div id="modifications" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>14. MODIFICATIONS AND INTERRUPTIONS</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        We reserve the right to change, modify, or remove the contents of the Services at any time
                        or for any reason at our sole discretion without notice. However, we have no obligation to
                        update any information on our Services. We will not be liable to you or any third party for any
                        modification, price change, suspension, or discontinuance of the Services.
                    </p>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        We cannot guarantee the Services will be available at all times. We may experience hardware,
                        software, or other problems or need to perform maintenance related to the Services,
                        resulting in interruptions, delays, or errors. We reserve the right to change, revise, update, suspend,
                        discontinue, or otherwise modify the Services at any time or for any reason without notice
                        to you. You agree that we have no liability whatsoever for any loss, damage, or inconvenience
                        caused by your inability to access or use the Services during any downtime or discontinuance
                        of the Services.
                    </p>
                </div>

                <div id="law" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>15. GOVERNING LAW</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        These Legal Terms shall be governed by and defined following the laws of Iowa. Doc Bear
                        Enterprises, LLC. and yourself irrevocably consent that the courts of Iowa shall have
                        exclusive jurisdiction to resolve any dispute which may arise in connection with these Legal Terms.
                    </p>
                </div>

                <div id="eu-geoblocking" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '19px', color: '#000000' }}>16. EU GEO-BLOCKING COMPLIANCE</h2>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>European Union Access Rights</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        In compliance with the <strong>Geo-blocking Regulation (EU) 2018/302</strong>, we do not engage in unjustified geo-blocking that discriminates against users based on:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Nationality</li>
                        <li>Place of residence</li>
                        <li>Place of establishment within the EU</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Service Availability</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>EU-Wide Access:</strong> Our Services are accessible throughout the European Union, subject to:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Applicable local laws and regulations</li>
                        <li>Technical availability of regional databases</li>
                        <li>Currency and language localization capabilities</li>
                    </ul>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>No Discrimination:</strong> We do not:
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Block EU users from accessing our Services based on their location within the EU</li>
                        <li>Apply different terms, conditions, or pricing based on EU member state residence</li>
                        <li>Restrict access to features based on nationality within the EU</li>
                    </ul>

                    <h3 style={{ fontSize: '17px', color: '#000000' }}>Regional Optimizations vs. Restrictions</h3>
                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>Permitted Regional Adaptations:</strong>
                    </p>
                    <ul style={{ color: '#595959', fontSize: '15px', marginLeft: '20px' }}>
                        <li>Currency display preferences (EUR, GBP, etc.)</li>
                        <li>Regional food database prioritization (UK vs. EU vs. Global Open Food Facts)</li>
                        <li>Language localization where available</li>
                        <li>Local measurement system preferences (metric vs. imperial)</li>
                    </ul>

                    <p style={{ color: '#595959', fontSize: '15px' }}>
                        <strong>These adaptations are optimizations, not restrictions</strong>, and users can manually override regional settings.
                    </p>
                </div>

                <div id="disputes" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>17. DISPUTE RESOLUTION</h2>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Informal Negotiations</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        To expedite resolution and control the cost of any dispute, controversy, or claim related to
                        these Legal Terms (each a "Dispute" and collectively, the "Disputes") brought by either you or
                        us (individually, a "Party" and collectively, the "Parties"), the Parties agree to first
                        attempt to negotiate any Dispute (except those Disputes expressly provided below) informally
                        for at least thirty (30) days before initiating arbitration. Such informal negotiations
                        commence upon written notice from one Party to the other Party.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Binding Arbitration</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Any dispute arising out of or in connection with these Legal Terms, including any question
                        regarding its existence, validity, or termination, shall be referred to and finally resolved
                        by the International Commercial Arbitration Court under the European Arbitration Chamber
                        (Belgium, Brussels, Avenue Louise, 146) according to the Rules of this ICAC, which, as a
                        result of referring to it, is considered as the part of this clause. The number of arbitrators
                        shall be one (1). The seat, or legal place, or arbitration shall be Cedar Rapids, Iowa. The
                        language of the proceedings shall be English. The governing law of these Legal Terms shall
                        be substantive law of Iowa.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Restrictions</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        The Parties agree that any arbitration shall be limited to the Dispute between the Parties
                        individually. To the full extent permitted by law, (a) no arbitration shall be joined with
                        any other proceeding; (b) there is no right or authority for any Dispute to be arbitrated on
                        a class-action basis or to utilize class action procedures; and (c) there is no right or
                        authority for any Dispute to be brought in a purported representative capacity on behalf of
                        the general public or any other persons.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Exceptions to Informal Negotiations and Arbitration</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        The Parties agree that the following Disputes are not subject to the above provisions
                        concerning informal negotiations binding arbitration: (a) any Disputes seeking to enforce
                        or protect, or concerning the validity of, any of the intellectual property rights of a
                        Party; (b) any Dispute related to, or arising from, allegations of theft, piracy, invasion
                        of privacy, or unauthorized use; and (c) any claim for injunctive relief. If this provision
                        is found to be illegal or unenforceable, then neither Party will elect to arbitrate any
                        Dispute falling within that portion of this provision found to be illegal or unenforceable
                        and such Dispute shall be decided by a court of competent jurisdiction within the courts
                        listed for jurisdiction above, and the Parties agree to submit to the personal jurisdiction
                        of that court.
                    </p>
                </div>

                <div id="corrections" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>18. CORRECTIONS</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        There may be information on the Services that contains typographical errors, inaccuracies,
                        or omissions, including descriptions, pricing, availability, and various other information.
                        We reserve the right to correct any errors, inaccuracies, or omissions and to change or
                        update the information on the Services at any time, without prior notice.
                    </p>
                </div>

                <div id="disclaimer" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>19. DISCLAIMER</h2>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Family-Friendly Content Assurance</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        ALL CONTENT WITHIN OUR SERVICES, INCLUDING RECIPES, NUTRITIONAL INFORMATION, AND MEAL PLANNING
                        FEATURES, IS APPROPRIATE FOR USERS 13 YEARS OF AGE AND OLDER. WE MAINTAIN FAMILY-FRIENDLY
                        STANDARDS AND DO NOT KNOWINGLY INCLUDE CONTENT THAT WOULD BE INAPPROPRIATE FOR OUR TARGET AGE
                        GROUP.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Food Safety and Dietary Disclaimer</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        <strong>IMPORTANT FOOD SAFETY AND DIETARY DISCLAIMER:</strong> THE SERVICES ARE PROVIDED ON AN
                        AS-IS AND AS-AVAILABLE BASIS. THE NUTRITIONAL INFORMATION, RECIPES, EXPIRATION DATE TRACKING,
                        FOOD SAFETY SUGGESTIONS, VOICE INPUT RESULTS, INTERNATIONAL BARCODE SCANNING, PRICE TRACKING
                        DATA, AND AI-POWERED RECIPE SCALING PROVIDED THROUGH OUR SERVICES ARE FOR INFORMATIONAL PURPOSES
                        ONLY AND SHOULD NOT BE CONSIDERED AS MEDICAL, DIETARY, FINANCIAL, OR FOOD SAFETY ADVICE.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>Voice Input and Technology Disclaimer</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        <strong>VOICE INPUT DISCLAIMER:</strong> VOICE RECOGNITION ACCURACY MAY VARY BASED ON YOUR
                        DEVICE, BROWSER, ENVIRONMENT, AND SPEECH PATTERNS. WE DO NOT GUARANTEE THE ACCURACY OF
                        VOICE-TO-TEXT CONVERSION OR THE RESULTING INVENTORY ENTRIES. YOU ARE RESPONSIBLE FOR
                        REVIEWING AND CONFIRMING ALL VOICE INPUT RESULTS.
                    </p>

                    <h3 style={{fontSize: '17px', color: '#000000'}}>International Features and Price Tracking Disclaimer</h3>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        <strong>INTERNATIONAL AND PRICE TRACKING DISCLAIMER:</strong> INTERNATIONAL BARCODE SCANNING,
                        PRODUCT INFORMATION, CURRENCY CONVERSION, AND PRICE TRACKING DATA ARE PROVIDED BY THIRD-PARTY
                        SOURCES AND MAY NOT BE ACCURATE, CURRENT, OR COMPLETE. WE DO NOT GUARANTEE THE ACCURACY OF
                        PRODUCT INFORMATION, PRICES, OR CURRENCY CONVERSION RATES. PRICE DATA IS FOR REFERENCE ONLY
                        AND SHOULD NOT BE USED FOR COMMERCIAL OR INVESTMENT DECISIONS.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        FOR USERS UNDER 18: WE STRONGLY RECOMMEND THAT MINORS CONSULT WITH PARENTS, GUARDIANS, OR
                        HEALTHCARE PROFESSIONALS BEFORE MAKING DIETARY DECISIONS, USING COOKING RECIPES, VOICE INPUT
                        FEATURES, OR ACCESSING PRICE TRACKING INFORMATION, ESPECIALLY IF THEY HAVE KNOWN FOOD
                        ALLERGIES OR DIETARY RESTRICTIONS.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        YOU ACKNOWLEDGE THAT: (1) WE ARE NOT RESPONSIBLE FOR THE ACCURACY OF NUTRITIONAL INFORMATION
                        PROVIDED BY THIRD-PARTY DATABASES; (2) RECIPE SUGGESTIONS BASED ON YOUR INVENTORY MAY NOT
                        ACCOUNT FOR ALL FOOD ALLERGIES OR DIETARY RESTRICTIONS; (3) EXPIRATION DATE TRACKING IS
                        BASED ON GENERAL GUIDELINES AND YOUR OWN ASSESSMENT OF FOOD SAFETY IS PARAMOUNT; (4) YOU
                        SHOULD ALWAYS CONSULT WITH HEALTHCARE PROFESSIONALS REGARDING DIETARY NEEDS AND RESTRICTIONS;
                        (5) MINORS SHOULD HAVE ADULT SUPERVISION WHEN COOKING OR HANDLING KITCHEN EQUIPMENT; (6) VOICE
                        INPUT RESULTS SHOULD BE VERIFIED FOR ACCURACY; (7) INTERNATIONAL PRODUCT INFORMATION MAY VARY
                        BY REGION AND DATABASE; (8) PRICE TRACKING DATA IS FOR PERSONAL REFERENCE ONLY; (9) AI-POWERED
                        RECIPE SCALING SUGGESTIONS SHOULD BE REVIEWED AND ADJUSTED BASED ON YOUR COOKING EXPERIENCE.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN
                        CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
                        WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE
                        MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES'
                        CONTENT OR THE CONTENT OF ANY WEBSITES OR MOBILE APPLICATIONS LINKED TO THE SERVICES.
                    </p>
                </div>

                <div id="liability" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>20. LIMITATIONS OF LIABILITY</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        IN NO EVENT WILL WE BE LIABLE FOR ANY DAMAGES ARISING FROM: (1) FOODBORNE ILLNESS OR ALLERGIC
                        REACTIONS RELATED TO RECIPES OR FOOD INVENTORY MANAGEMENT; (2) RELIANCE ON NUTRITIONAL
                        INFORMATION PROVIDED THROUGH THE SERVICES; (3) FOOD WASTE OR SPOILAGE RELATED TO EXPIRATION
                        DATE TRACKING FEATURES; (4) ANY DECISIONS MADE BASED ON RECIPE RECOMMENDATIONS, MEAL PLANNING
                        FEATURES, OR AI-POWERED RECIPE SCALING; (5) INACCURACIES IN VOICE INPUT RECOGNITION OR
                        VOICE-TO-TEXT CONVERSION; (6) ERRORS IN INTERNATIONAL BARCODE SCANNING OR PRODUCT
                        IDENTIFICATION; (7) CURRENCY CONVERSION INACCURACIES OR FINANCIAL LOSSES RELATED TO PRICE
                        TRACKING; (8) RELIANCE ON PRICE TRACKING DATA FOR PURCHASING OR INVESTMENT DECISIONS; (9) TECHNICAL
                        ISSUES WITH VOICE INPUT, BARCODE SCANNING, OR INTERNATIONAL FEATURES; (10) ANY DAMAGES R
                        ESULTING FROM THE USE OF THIRD-PARTY DATABASES OR SERVICES INTEGRATED WITH OUR PLATFORM.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        YOU ACKNOWLEDGE THAT FOOD SAFETY, DIETARY DECISIONS, FINANCIAL MANAGEMENT, AND TECHNOLOGY USE
                        ARE YOUR PERSONAL RESPONSIBILITY AND THAT OUR SERVICES ARE TOOLS TO ASSIST WITH ORGANIZATION
                        AND PLANNING, NOT SUBSTITUTES FOR PROPER FOOD SAFETY PRACTICES, PROFESSIONAL DIETARY ADVICE,
                        FINANCIAL PLANNING, OR CAREFUL VERIFICATION OF TECHNOLOGY-GENERATED RESULTS.
                    </p>

                    <p style={{color: '#595959', fontSize: '15px'}}>
                        IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY
                        FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES,
                        INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF
                        THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                    </p>
                </div>

                <div id="indemnification" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>21. INDEMNIFICATION</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        You agree to defend, indemnify, and hold us harmless, including our subsidiaries,
                        affiliates, and all of our respective officers, agents, partners, and employees, from and against any
                        loss, damage, liability, claim, or demand, including reasonable attorneys' fees and expenses, made
                        by any third party due to or arising out of: (1) use of the Services; (2) breach of these Legal
                        Terms; (3) any breach of your representations and warranties set forth in these Legal Terms;
                        (4) your violation of the rights of a third party, including but not limited to intellectual
                        property rights; or (5) any overt harmful act toward any other user of the Services with
                        whom you connected via the Services. Notwithstanding the foregoing, we reserve the right, at your
                        expense, to assume the exclusive defense and control of any matter for which you are
                        required to indemnify us, and you agree to cooperate, at your expense, with our defense of such claims.
                    </p>
                </div>

                <div id="userdata" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>22. USER DATA</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        We will maintain certain data that you transmit to the Services for the purpose of managing
                        the performance of the Services, as well as data relating to your use of the Services. Although
                        we perform regular routine backups of data, you are solely responsible for all data that you
                        transmit or that relates to any activity you have undertaken using the Services. You agree
                        that we shall have no liability to you for any loss or corruption of any such data, and you
                        hereby waive any right of action against us arising from any such loss or corruption of such data.
                    </p>
                </div>

                <div id="electronic" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>23. ELECTRONIC COMMUNICATIONS, TRANSACTIONS,
                        AND SIGNATURES</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        Visiting the Services, sending us emails, and completing online forms constitute electronic
                        communications. You consent to receive electronic communications, and you agree that all
                        agreements, notices, disclosures, and other communications we provide to you electronically,
                        via email and on the Services, satisfy any legal requirement that such communication be in
                        writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES, CONTRACTS, ORDERS, AND OTHER RECORDS,
                        AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND RECORDS OF TRANSACTIONS INITIATED OR
                        COMPLETED BY US OR VIA THE SERVICES.
                    </p>
                </div>

                <div id="misc" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>24. MISCELLANEOUS</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        These Legal Terms and any policies or operating rules posted by us on the Services or in
                        respect to the Services constitute the entire agreement and understanding between you and us. Our
                        failure to exercise or enforce any right or provision of these Legal Terms shall not operate
                        as a waiver of such right or provision. These Legal Terms operate to the fullest extent
                        permissible by law. We may assign any or all of our rights and obligations to others at any time. We
                        shall not be responsible or liable for any loss, damage, delay, or failure to act caused by any
                        cause beyond our reasonable control. If any provision or part of a provision of these Legal Terms
                        is determined to be unlawful, void, or unenforceable, that provision or part of the provision
                        is deemed severable from these Legal Terms and does not affect the validity and enforceability
                        of any remaining provisions.
                    </p>
                </div>

                {/* Include remaining sections with contact information */}
                <div id="contact" style={{marginBottom: '2rem'}}>
                    <h2 style={{fontSize: '19px', color: '#000000'}}>25. CONTACT US</h2>
                    <p style={{color: '#595959', fontSize: '15px'}}>
                        In order to resolve a complaint regarding the Services or to receive further information
                        regarding use of the Services, please contact us at:
                    </p>
                    <div style={{color: '#595959', fontSize: '15px', marginTop: '1rem'}}>
                        <div><strong>Doc Bear Enterprises, LLC.</strong></div>
                        <div>5249 N Park Pl NE, PMB 4011</div>
                        <div>Cedar Rapids, IA 52402</div>
                        <div>United States</div>
                        <div>Phone: (319) 826-3463</div>
                        <div>Email: privacy@docbearscomfort.kitchen</div>
                    </div>
                </div>

                <div style={{marginTop: '3rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '5px'}}>
                    <p style={{color: '#666', fontSize: '14px', textAlign: 'center', margin: '0'}}>
                        These terms are specifically tailored for Doc Bear's Comfort Kitchen application and its
                        food inventory management features.
                    </p>
                </div>
            </div>
    );
};

export default TermsOfUse;