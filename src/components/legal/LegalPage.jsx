// src/components/legal/LegalPage.jsx
import React, { useState } from 'react';
import { AboutUs, PrivacyPolicy, TermsOfUse } from './index';

const LegalPage = () => {
    const [activeTab, setActiveTab] = useState('about');

    const tabs = [
        { id: 'about', label: 'About Us', component: AboutUs },
        { id: 'privacy', label: 'Privacy Policy', component: PrivacyPolicy },
        { id: 'terms', label: 'Terms of Use', component: TermsOfUse }
    ];

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AboutUs;

    return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: '#f8f9fa',
                fontFamily: 'Arial, sans-serif'
            }}>
                {/* Header */}
                <div style={{
                    backgroundColor: '#fff',
                    borderBottom: '1px solid #e9ecef',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        maxWidth: '1200px',
                        margin: '0 auto',
                        padding: '20px 40px'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h1 style={{
                                fontSize: '32px',
                                color: '#2c3e50',
                                marginBottom: '10px',
                                fontWeight: 'bold'
                            }}>
                                Doc Bear's Comfort Kitchen Legal Information
                            </h1>
                            <p style={{
                                fontSize: '18px',
                                color: '#7f8c8d',
                                fontStyle: 'italic',
                                margin: '0'
                            }}>
                                Complete legal documentation for our AI-powered food inventory and recipe management platform
                            </p>
                        </div>

                        {/* Navigation Tabs */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                            marginBottom: '20px'
                        }}>
                            {tabs.map(tab => (
                                    <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            style={{
                                                padding: '12px 24px',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                color: activeTab === tab.id ? '#fff' : '#2c3e50',
                                                backgroundColor: activeTab === tab.id ? '#e74c3c' : '#fff',
                                                border: activeTab === tab.id ? '2px solid #e74c3c' : '2px solid #e9ecef',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                minWidth: '140px'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (activeTab !== tab.id) {
                                                    e.target.style.backgroundColor = '#f8f9fa';
                                                    e.target.style.borderColor = '#e74c3c';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (activeTab !== tab.id) {
                                                    e.target.style.backgroundColor = '#fff';
                                                    e.target.style.borderColor = '#e9ecef';
                                                }
                                            }}
                                    >
                                        {tab.label}
                                    </button>
                            ))}
                        </div>

                        {/* Quick Links */}
                        <div style={{
                            backgroundColor: '#e3f2fd',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '2px solid #2196f3',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: '14px',
                                color: '#1565c0',
                                margin: '0',
                                fontWeight: '500'
                            }}>
                                📧 Questions? Contact us at{' '}
                                <a
                                        href="mailto:privacy@docbearscomfort.kitchen"
                                        style={{ color: '#1565c0', textDecoration: 'underline' }}
                                >
                                    privacy@docbearscomfort.kitchen
                                </a>
                                {' '}| 📞 Business: (319) 826-3463 | 🌐{' '}
                                <a
                                        href="https://docbearscomfort.kitchen"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#1565c0', textDecoration: 'underline' }}
                                >
                                    docbearscomfort.kitchen
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Document Content */}
                <div style={{
                    backgroundColor: '#fff',
                    minHeight: 'calc(100vh - 200px)'
                }}>
                    <ActiveComponent />
                </div>

                {/* Footer */}
                <div style={{
                    backgroundColor: '#2c3e50',
                    color: '#fff',
                    padding: '30px 20px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        maxWidth: '900px',
                        margin: '0 auto'
                    }}>
                        <h3 style={{
                            fontSize: '20px',
                            marginBottom: '15px',
                            color: '#fff'
                        }}>
                            Doc Bear Enterprises, LLC.
                        </h3>
                        <p style={{
                            fontSize: '16px',
                            marginBottom: '10px',
                            color: '#bdc3c7'
                        }}>
                            5249 N Park Pl NE, PMB 4011, Cedar Rapids, IA 52402
                        </p>
                        <p style={{
                            fontSize: '16px',
                            marginBottom: '20px',
                            color: '#bdc3c7'
                        }}>
                            Phone: (319) 826-3463 | Email: privacy@docbearscomfort.kitchen
                        </p>

                        <div style={{
                            borderTop: '1px solid #34495e',
                            paddingTop: '20px',
                            marginTop: '20px'
                        }}>
                            <p style={{
                                fontSize: '14px',
                                color: '#95a5a6',
                                margin: '0 0 10px 0'
                            }}>
                                🌍 Supporting 80+ countries with international barcode scanning, AI-powered recipe scaling, voice input, and comprehensive privacy compliance including GDPR and COPPA.
                            </p>
                            <p style={{
                                fontSize: '14px',
                                color: '#95a5a6',
                                margin: '0'
                            }}>
                                Last Updated: July 25, 2025 | All documents reflect our latest features and global compliance requirements.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default LegalPage;