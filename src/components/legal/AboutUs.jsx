// file: src/components/legal/AboutUs.jsx v1

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
                        About Doc Bear's Comfort Food
                    </h1>
                    <p style={{ fontSize: '18px', color: '#7f8c8d', fontStyle: 'italic' }}>
                        Your Personal Food Inventory & Recipe Management Solution
                    </p>
                </div>

                {/* About the Application Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>About Our Application</h2>
                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Doc Bear's Comfort Food is a comprehensive web application designed to revolutionize how you manage your home food inventory and discover delicious recipes. Our platform seamlessly combines inventory tracking with intelligent recipe matching, making meal planning easier and more efficient than ever before.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Whether you're scanning UPC codes, manually entering food items, or exploring hundreds of recipes from the acclaimed "Doc Bear's Comfort Food Survival Guide" cookbook series, our application helps you make the most of what you have while discovering new culinary adventures. The intelligent recipe matching system automatically suggests meals you can make with your current inventory, and even recommends recipes that are just a few ingredients away from completion.
                    </p>

                    <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', margin: '1.5rem 0' }}>
                        <h3 style={{ fontSize: '20px', color: '#2c3e50', marginBottom: '1rem' }}>Key Features</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🏠 Smart Inventory Management</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Scan UPC codes or manually add items to track your food inventory with expiration dates and quantities.</p>
                            </div>
                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>👨‍🍳 Recipe Discovery</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Access hundreds of recipes from Doc Bear's cookbook series plus add your own custom recipes.</p>
                            </div>
                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🎯 Intelligent Matching</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Get recipe suggestions based on your current inventory and discover meals you can make right now.</p>
                            </div>
                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📋 Smart Shopping Lists</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Generate shopping lists from recipes or meal plans, with the ability to email lists to family and friends.</p>
                            </div>
                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>📱 Multi-Device Access</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Works seamlessly on desktop and mobile devices, soon to be available as a Progressive Web App (PWA).</p>
                            </div>
                            <div>
                                <h4 style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '0.5rem' }}>🥗 Nutritional Information</h4>
                                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Access nutritional data for your inventory items and recipes to make informed dietary choices.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* About the Creator Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '2rem' }}>About the Creator</h2>

                    <div style={{
                        display: 'flex',
                        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                        alignItems: window.innerWidth < 768 ? 'center' : 'flex-start',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '2rem',
                            marginRight: window.innerWidth < 768 ? '0' : '2rem'
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
                                border: '4px solid #f8f9fa'
                            }}>
                                <span style={{ fontSize: '24px', color: '#6c757d' }}>
                                    <link href="/icons/edmckeown.jpg" />
                                </span>
                            </div>
                            <h3 style={{ fontSize: '20px', color: '#2c3e50', marginBottom: '0.5rem' }}>Dr. Edward McKeown</h3>
                            <p style={{ fontSize: '16px', color: '#7f8c8d', fontStyle: 'italic', margin: '0' }}>
                                U.S. Marine Corps Veteran<br/>
                                Founder & Creator
                            </p>
                        </div>

                        <div style={{ flex: 1 }}>
                            <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                                Dr. Edward McKeown, a United States Marine Corps veteran, is the founder and creator of Doc Bear's Comfort Food application. Born in Mexico, Missouri, Dr. McKeown brings over 30 years of experience in hospitality management, food safety, and business operations to this innovative platform.
                            </p>

                            <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                                Dr. McKeown's unique educational journey spans decades of continuous learning. He began at Pima Community College in 1996, earning his Associate's degree in General Studies with an emphasis on culinary arts, plus a certificate in Hotel Food & Beverage Management. He continued at the University of Nevada, Las Vegas, earning his Bachelor's (2006) and Master's (2008) degrees in Hotel Administration, followed by his Ph.D. in Hospitality and Tourism Management from Purdue University in 2014.
                            </p>

                            <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                                Making a career pivot toward technology, Dr. McKeown is currently pursuing dual degrees in Computer Software Development and Web Application Development at Kirkwood Community College, along with certifications in Java Programming and .NET Programming. This unique combination of hospitality expertise, food safety knowledge, and technical skills enables him to create solutions that truly serve both food enthusiasts and home cooks.
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
                        Doc Bear's Comfort Food was born from a simple belief: managing your home food inventory and meal planning should be simple, efficient, and enjoyable. By combining intelligent inventory tracking with recipe discovery and meal planning tools, we're helping families reduce food waste, save money, and discover new culinary adventures using ingredients they already have at home.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Our platform bridges the gap between what's in your pantry and what's on your dinner table. Whether you're a busy parent trying to plan the week's meals, a college student learning to cook, or a food enthusiast looking to make the most of your ingredients, our application provides the tools you need to succeed in the kitchen.
                    </p>

                    <div style={{ backgroundColor: '#d1ecf1', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #17a2b8' }}>
                        <h3 style={{ fontSize: '18px', color: '#0c5460', marginBottom: '1rem' }}>Why Doc Bear's Comfort Food?</h3>
                        <ul style={{ color: '#0c5460', fontSize: '15px', marginLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Reduce food waste by tracking expiration dates and using ingredients efficiently</li>
                            <li style={{ marginBottom: '0.5rem' }}>Save money by planning meals around what you already have</li>
                            <li style={{ marginBottom: '0.5rem' }}>Discover new recipes that match your available ingredients</li>
                            <li style={{ marginBottom: '0.5rem' }}>Streamline shopping with intelligent list generation</li>
                            <li style={{ marginBottom: '0.5rem' }}>Access trusted recipes from the Doc Bear's Comfort Food Survival Guide series</li>
                            <li>Make informed dietary choices with integrated nutritional information</li>
                        </ul>
                    </div>
                </section>

                {/* Technology Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '1rem' }}>Built with Modern Technology</h2>
                    <p style={{ color: '#444', fontSize: '16px', marginBottom: '1rem' }}>
                        Our application is built using cutting-edge web technologies including React for a responsive, intuitive user interface. The platform is designed to work seamlessly across all devices and will soon be available as a Progressive Web App (PWA), allowing for offline access and app-like functionality on mobile devices.
                    </p>

                    <p style={{ color: '#444', fontSize: '16px' }}>
                        We integrate with reliable nutritional databases and recipe sources to provide accurate information while respecting intellectual property rights. Our UPC scanning feature and recipe import capabilities from popular sites like AllRecipes.com and Cookist.com make it easy to build your inventory and recipe collection quickly.
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
                        Have questions, suggestions, or feedback about Doc Bear's Comfort Food? We'd love to hear from you!
                    </p>
                    <div style={{ color: '#666', fontSize: '16px' }}>
                        <p><strong>Doc Bear Enterprises, LLC.</strong></p>
                        <p>3920 Lennox Ave NE<br/>Cedar Rapids, IA 52402</p>
                        <p>
                            Email: <a href="mailto:privacy@docbear-ent.com" style={{ color: '#e74c3c', textDecoration: 'none' }}>privacy@docbear-ent.com</a><br/>
                            Website: <a href="https://docbearscomfort.kitchen" target="_blank" rel="noopener noreferrer" style={{ color: '#e74c3c', textDecoration: 'none' }}>docbearscomfort.kitchen</a>
                        </p>
                    </div>
                </section>

                {/* Footer Note */}
                <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                    <p style={{ color: '#6c757d', fontSize: '14px', textAlign: 'center', margin: '0' }}>
                        Doc Bear's Comfort Food - Making home cooking easier, one recipe at a time. 🍳
                    </p>
                </div>
            </div>
    );
};

export default AboutUs;