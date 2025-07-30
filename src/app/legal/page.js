'use client';

// src/app/legal/page.js v1

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AboutUs from '../../components/legal/AboutUs';
import PrivacyPolicy from '../../components/legal/PrivacyPolicy';
import TermsOfUse from '../../components/legal/TermsOfUse';

export default function LegalPage() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('about');

    // Handle URL query parameters for direct linking
    useEffect(() => {
        const tab = searchParams?.get('tab');
        if (tab && ['about', 'privacy', 'terms'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const tabs = [
        { id: 'about', label: 'About Us', component: AboutUs },
        { id: 'privacy', label: 'Privacy Policy', component: PrivacyPolicy },
        { id: 'terms', label: 'Terms of Use', component: TermsOfUse }
    ];

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        // Update URL without page reload
        const newUrl = `/legal?tab=${tabId}`;
        window.history.pushState(null, '', newUrl);
    };

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
                            Complete legal documentation and business information
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
                                onClick={() => handleTabChange(tab.id)}
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

                    {/* Business Contact Information Banner */}
                    <div style={{
                        backgroundColor: '#e3f2fd',
                        padding: '15px',
                        borderRadius: '8px',
                        border: '2px solid #2196f3',
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            fontSize: '16px',
                            color: '#1565c0',
                            fontWeight: 'bold',
                            marginBottom: '8px'
                        }}>
                            Doc Bear Enterprises, LLC.
                        </div>
                        <div style={{
                            fontSize: '14px',
                            color: '#1565c0',
                            marginBottom: '8px'
                        }}>
                            5249 N Park Pl NE, PMB 4011, Cedar Rapids, IA 52402
                        </div>
                        <div style={{
                            fontSize: '14px',
                            color: '#1565c0'
                        }}>
                            📞 Business: (319) 826-3463 | 📧{' '}
                            <a
                                href="mailto:privacy@docbearscomfort.kitchen"
                                style={{ color: '#1565c0', textDecoration: 'underline' }}
                            >
                                privacy@docbearscomfort.kitchen
                            </a>
                        </div>
                    </div>

                    {/* Regional Compliance Quick Reference */}
                    <div style={{
                        backgroundColor: '#fff3cd',
                        padding: '15px',
                        borderRadius: '8px',
                        border: '2px solid #ffc107',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            fontSize: '14px',
                            color: '#856404',
                            textAlign: 'center'
                        }}>
                            <strong>📋 International Compliance:</strong> Japan Commercial Transactions Act • Korea Business Registration • EU GDPR • Brazil Merchant Requirements • Global Privacy Standards
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Content */}
            <div style={{
                backgroundColor: '#fff',
                minHeight: 'calc(100vh - 300px)'
            }}>
                <ActiveComponent />
            </div>

            {/* Footer with Business Information */}
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
                        5249 N Park Pl NE, PMB 4011, Cedar Rapids, IA 52402, United States
                    </p>
                    <p style={{
                        fontSize: '16px',
                        marginBottom: '20px',
                        color: '#bdc3c7'
                    }}>
                        Business Phone: (319) 826-3463 | Email: privacy@docbearscomfort.kitchen
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
                            🌍 Supporting 80+ countries • 🎤 Voice Input • 💰 Multi-Currency Price Tracking • ⚖️ AI Recipe Scaling
                        </p>
                        <p style={{
                            fontSize: '14px',
                            color: '#95a5a6',
                            margin: '0 0 10px 0'
                        }}>
                            GDPR, COPPA, and international privacy compliant • Content Rating: 13+ Educational
                        </p>
                        <p style={{
                            fontSize: '12px',
                            color: '#7f8c8d',
                            margin: '0'
                        }}>
                            Last Updated: July 25, 2025 | All documents reflect our latest features and global compliance requirements.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}