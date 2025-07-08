// file: app/account-deletion/page.js

import React from 'react';
import Head from 'next/head';

export default function AccountDeletionPage() {
    return (
        <>
            <Head>
                <title>Account Deletion Request - Doc Bear's Comfort Kitchen</title>
                <meta name="description" content="Request account deletion for Doc Bear's Comfort Kitchen. Learn about our data deletion process and timeline." />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <div className="account-deletion-page">
                <style jsx>{`
                    .account-deletion-page {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        background-color: #f8fafc;
                        min-height: 100vh;
                    }
                    
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 3rem 2rem;
                        border-radius: 12px;
                        text-align: center;
                        margin-bottom: 2rem;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    }
                    
                    .header h1 {
                        font-size: 2.5rem;
                        margin-bottom: 0.5rem;
                        font-weight: 700;
                    }
                    
                    .header p {
                        font-size: 1.1rem;
                        opacity: 0.9;
                    }
                    
                    .content {
                        background: white;
                        padding: 2.5rem;
                        border-radius: 12px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                        margin-bottom: 2rem;
                    }
                    
                    .warning-box {
                        background: #fef2f2;
                        border: 2px solid #fecaca;
                        border-radius: 8px;
                        padding: 1.5rem;
                        margin: 2rem 0;
                    }
                    
                    .warning-box h3 {
                        color: #dc2626;
                        margin-bottom: 0.5rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    
                    .warning-box p {
                        color: #991b1b;
                        font-weight: 500;
                    }
                    
                    .steps {
                        margin: 2rem 0;
                    }
                    
                    .step {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 1.5rem;
                        margin-bottom: 1rem;
                        position: relative;
                    }
                    
                    .step-number {
                        background: #4f46e5;
                        color: white;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        position: absolute;
                        top: -15px;
                        left: 20px;
                        font-size: 14px;
                    }
                    
                    .step h4 {
                        margin-left: 20px;
                        margin-bottom: 0.5rem;
                        color: #1e293b;
                        font-size: 1.1rem;
                    }
                    
                    .step p {
                        margin-left: 20px;
                        color: #64748b;
                    }
                    
                    .alternative-box {
                        background: #eff6ff;
                        border: 2px solid #bfdbfe;
                        border-radius: 8px;
                        padding: 1.5rem;
                        margin: 2rem 0;
                    }
                    
                    .alternative-box h3 {
                        color: #1d4ed8;
                        margin-bottom: 0.5rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    
                    .data-section {
                        margin: 2rem 0;
                    }
                    
                    .data-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 1.5rem;
                        margin: 1.5rem 0;
                    }
                    
                    .data-card {
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 1.5rem;
                        background: white;
                    }
                    
                    .data-card.deleted {
                        border-color: #fecaca;
                        background: #fef2f2;
                    }
                    
                    .data-card.retained {
                        border-color: #fed7aa;
                        background: #fff7ed;
                    }
                    
                    .data-card h4 {
                        margin-bottom: 1rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    
                    .data-card ul {
                        list-style: none;
                        padding: 0;
                    }
                    
                    .data-card li {
                        padding: 0.25rem 0;
                        padding-left: 1rem;
                        position: relative;
                    }
                    
                    .data-card li:before {
                        content: "•";
                        position: absolute;
                        left: 0;
                        color: #64748b;
                    }
                    
                    .contact-info {
                        background: #f1f5f9;
                        border-radius: 8px;
                        padding: 2rem;
                        text-align: center;
                        margin: 2rem 0;
                    }
                    
                    .contact-info h3 {
                        margin-bottom: 1rem;
                        color: #1e293b;
                    }
                    
                    .contact-details {
                        display: flex;
                        justify-content: center;
                        gap: 2rem;
                        flex-wrap: wrap;
                        margin: 1rem 0;
                    }
                    
                    .contact-item {
                        background: white;
                        padding: 1rem 1.5rem;
                        border-radius: 6px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    
                    .contact-item strong {
                        display: block;
                        color: #4f46e5;
                        margin-bottom: 0.25rem;
                    }
                    
                    .footer {
                        text-align: center;
                        padding: 2rem;
                        color: #64748b;
                        border-top: 1px solid #e2e8f0;
                        background: white;
                        border-radius: 12px;
                        margin-top: 2rem;
                    }
                    
                    .btn {
                        display: inline-block;
                        background: #4f46e5;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                        margin: 1rem 0.5rem;
                        transition: background-color 0.2s;
                        cursor: pointer;
                    }
                    
                    .btn:hover {
                        background: #4338ca;
                    }
                    
                    .btn-secondary {
                        background: #64748b;
                    }
                    
                    .btn-secondary:hover {
                        background: #475569;
                    }
                    
                    .list-style {
                        margin: 1rem 0;
                        padding-left: 2rem;
                    }
                    
                    .list-style li {
                        margin-bottom: 0.5rem;
                    }
                    
                    @media (max-width: 768px) {
                        .container {
                            padding: 10px;
                        }
                        
                        .header {
                            padding: 2rem 1rem;
                        }
                        
                        .header h1 {
                            font-size: 2rem;
                        }
                        
                        .content {
                            padding: 1.5rem;
                        }
                        
                        .contact-details {
                            flex-direction: column;
                            align-items: center;
                            gap: 1rem;
                        }
                    }
                `}</style>

                <div className="container">
                    <div className="header">
                        <h1>🍳 Account Deletion Request</h1>
                        <p>Doc Bear's Comfort Kitchen - Food Inventory & Recipe Management</p>
                    </div>

                    <div className="content">
                        <div className="warning-box">
                            <h3>⚠️ Important Notice</h3>
                            <p>Account deletion is permanent and cannot be undone. All your personal data, recipes, meal plans, and inventory information will be permanently removed from our systems.</p>
                        </div>

                        <h2>How to Delete Your Account</h2>
                        <p>You can delete your Doc Bear's Comfort Kitchen account using either of the following methods:</p>

                        <div className="steps">
                            <h3>Method 1: Delete Account Through the App</h3>

                            <div className="step">
                                <div className="step-number">1</div>
                                <h4>Open the App</h4>
                                <p>Launch the Doc Bear's Comfort Kitchen application on your device and ensure you are signed in to your account.</p>
                            </div>

                            <div className="step">
                                <div className="step-number">2</div>
                                <h4>Navigate to Profile Settings</h4>
                                <p>Tap on your profile or go to the main menu and select "Profile Settings".</p>
                            </div>

                            <div className="step">
                                <div className="step-number">3</div>
                                <h4>Go to Security Tab</h4>
                                <p>In your profile settings, select the "Security" tab from the available options.</p>
                            </div>

                            <div className="step">
                                <div className="step-number">4</div>
                                <h4>Delete Account</h4>
                                <p>Scroll down to the "Danger Zone" section and click "Delete Account". Follow the confirmation prompts to permanently delete your account.</p>
                            </div>
                        </div>

                        <div className="alternative-box">
                            <h3>📧 Method 2: Email Request</h3>
                            <p>If you're unable to access the app or prefer to delete your account via email, you can send a deletion request to our support team. Please include your full name and the email address associated with your account.</p>
                            <p><strong>Email:</strong> <a href="mailto:privacy@docbearscomfort.kitchen?subject=Account%20Deletion%20Request">privacy@docbearscomfort.kitchen</a></p>
                            <p><strong>Response Time:</strong> We will process your request within 7 business days.</p>
                        </div>

                        <div className="data-section">
                            <h2>What Data Will Be Deleted or Retained</h2>
                            <p>Here's a detailed breakdown of how your data will be handled during account deletion:</p>

                            <div className="data-grid">
                                <div className="data-card deleted">
                                    <h4>🗑️ Data Deleted Immediately</h4>
                                    <ul>
                                        <li>Personal profile information (name, bio, preferences)</li>
                                        <li>Food inventory data and tracking history</li>
                                        <li>Custom recipes and meal plans</li>
                                        <li>Shopping lists and meal planning data</li>
                                        <li>Profile avatars and uploaded images</li>
                                        <li>Notification settings and preferences</li>
                                        <li>Nutrition goals and dietary restrictions</li>
                                        <li>Account login credentials</li>
                                    </ul>
                                </div>

                                <div className="data-card deleted">
                                    <h4>🕒 Data Deleted Within 30 Days</h4>
                                    <ul>
                                        <li>Backup data and system logs</li>
                                        <li>Cached information on our servers</li>
                                        <li>Temporary files and session data</li>
                                        <li>Email communication history</li>
                                    </ul>
                                </div>

                                <div className="data-card retained">
                                    <h4>📋 Data Retained (Legal Requirements)</h4>
                                    <ul>
                                        <li>Basic transaction records (subscription history) - up to 7 years for tax/legal compliance</li>
                                        <li>Aggregated, anonymized usage statistics</li>
                                        <li>Public recipe contributions (anonymized)</li>
                                    </ul>
                                    <p style={{marginTop: '1rem', fontSize: '0.9em', color: '#64748b'}}>
                                        <strong>Note:</strong> Retained data cannot be linked back to your personal identity.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="data-section">
                            <h2>Before You Delete</h2>
                            <p>Consider these alternatives before permanently deleting your account:</p>
                            <ul className="list-style">
                                <li><strong>Export Your Data:</strong> Save your recipes and meal plans before deletion</li>
                                <li><strong>Downgrade Subscription:</strong> Switch to our free plan instead of deleting</li>
                                <li><strong>Temporary Deactivation:</strong> Contact us about temporarily suspending your account</li>
                                <li><strong>Privacy Settings:</strong> Adjust your privacy settings if data concerns are the issue</li>
                            </ul>
                        </div>
                    </div>

                    <div className="contact-info">
                        <h3>Need Help or Have Questions?</h3>
                        <p>Our support team is here to assist you with account deletion or any other concerns.</p>

                        <div className="contact-details">
                            <div className="contact-item">
                                <strong>Email Support</strong>
                                privacy@docbearscomfort.kitchen
                            </div>
                            <div className="contact-item">
                                <strong>Response Time</strong>
                                Within 7 business days
                            </div>
                            <div className="contact-item">
                                <strong>Business Hours</strong>
                                Monday - Friday, 9 AM - 5 PM CST
                            </div>
                        </div>

                        <div style={{marginTop: '2rem'}}>
                            <a href="https://docbearscomfort.kitchen" className="btn">Return to App</a>
                            <a href="https://docbearscomfort.kitchen/privacy-policy" className="btn btn-secondary">Privacy Policy</a>
                        </div>
                    </div>

                    <div className="footer">
                        <p>
                            <strong>Doc Bear Enterprises, LLC.</strong><br/>
                            Cedar Rapids, IA, United States<br/>
                            <a href="mailto:privacy@docbearscomfort.kitchen">privacy@docbearscomfort.kitchen</a>
                        </p>
                        <p style={{marginTop: '1rem', fontSize: '0.9em'}}>
                            This page is specifically for Doc Bear's Comfort Kitchen account deletion requests.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}