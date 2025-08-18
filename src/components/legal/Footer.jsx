'use client';

// file: src/components/legal/Footer.jsx v4 - iOS App Store Compliant (removed Google Play references)

import React, { useState, useEffect } from 'react';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfUse from './TermsOfUse';
import AboutUs from './AboutUs';
import CookieConsent from './CookieConsent'; // You'll need to create this
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { useRouter } from 'next/navigation';
import { usePlatform } from '@/hooks/usePlatform'; // Use unified platform detection

const Footer = () => {
    const [activeModal, setActiveModal] = useState(null);
    const [showCookieConsent, setShowCookieConsent] = useState(false);
    const [isEUUser, setIsEUUser] = useState(false);
    const router = useRouter();
    const platform = usePlatform();

    // Check if user is in EU/EEA and needs cookie consent
    useEffect(() => {
        const checkUserRegion = () => {
            try {
                // Simple EU detection based on timezone
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const euTimezones = [
                    'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Rome',
                    'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna',
                    'Europe/Prague', 'Europe/Warsaw', 'Europe/Stockholm', 'Europe/Copenhagen',
                    'Europe/Helsinki', 'Europe/Dublin', 'Europe/Lisbon', 'Europe/Athens',
                    'Europe/Budapest', 'Europe/Bucharest', 'Europe/Sofia', 'Europe/Zagreb',
                    'Europe/Ljubljana', 'Europe/Bratislava', 'Europe/Vilnius', 'Europe/Riga',
                    'Europe/Tallinn', 'Europe/Luxembourg', 'Europe/Malta', 'Europe/Nicosia'
                ];

                const isEU = euTimezones.includes(timezone);
                setIsEUUser(isEU);

                // Check if user has already consented to cookies
                if (typeof window !== 'undefined') {
                    const hasConsented = localStorage.getItem('cookie-consent');
                    if (isEU && !hasConsented) {
                        setShowCookieConsent(true);
                    }
                }
            } catch (error) {
                console.error('Error detecting region:', error);
                // Default to showing cookie consent if detection fails
                if (typeof window !== 'undefined') {
                    const hasConsented = localStorage.getItem('cookie-consent');
                    if (!hasConsented) {
                        setShowCookieConsent(true);
                    }
                }
            }
        };

        checkUserRegion();
    }, []);

    const openModal = (modalType) => {
        setActiveModal(modalType);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setActiveModal(null);
        document.body.style.overflow = 'unset';
    };

    const Modal = ({ isOpen, onClose, children, title }) => {
        if (!isOpen) return null;

        return (
                <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '20px'
                        }}
                        onClick={onClose}
                >
                    <div
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                position: 'relative',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            position: 'sticky',
                            top: 0,
                            backgroundColor: 'white',
                            borderBottom: '1px solid #e9ecef',
                            padding: '1rem 2rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            zIndex: 10
                        }}>
                            <h2 style={{ margin: 0, color: '#2c3e50' }}>{title}</h2>
                            <TouchEnhancedButton
                                    onClick={onClose}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        color: '#6c757d',
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '30px',
                                        height: '30px'
                                    }}
                                    aria-label="Close"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>
                        <div style={{ padding: '0' }}>
                            {children}
                        </div>
                    </div>
                </div>
        );
    };

    return (
            <>
                <footer style={{
                    backgroundColor: '#2c3e50',
                    color: 'white',
                    padding: '2rem 0',
                    marginTop: 'auto'
                }}>
                    <div style={{
                        maxWidth: '1200px',
                        margin: '0 auto',
                        padding: '0 20px'
                    }}>
                        {/* Main Footer Content */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '2rem',
                            marginBottom: '2rem'
                        }}>
                            {/* About Section */}
                            <div>
                                <h3 style={{
                                    fontSize: '18px',
                                    marginBottom: '1rem',
                                    color: '#e74c3c'
                                }}>
                                    Doc Bear's Comfort Kitchen
                                </h3>
                                <p style={{
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    color: '#bdc3c7',
                                    margin: '0 0 1rem 0'
                                }}>
                                    Your AI-powered food inventory and recipe management solution.
                                    Reduce waste, save money, and discover new meals with ingredients you already have.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <span style={{
                                        backgroundColor: '#34495e',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#ecf0f1'
                                    }}>
                                        🌍 International Support
                                    </span>
                                    <span style={{
                                        backgroundColor: '#34495e',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#ecf0f1'
                                    }}>
                                        🎤 Voice Input
                                    </span>
                                    <span style={{
                                        backgroundColor: '#34495e',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#ecf0f1'
                                    }}>
                                        💰 Price Tracking
                                    </span>
                                    <span style={{
                                        backgroundColor: '#34495e',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#ecf0f1'
                                    }}>
                                        ⚖️ AI Recipe Scaling
                                    </span>
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <h3 style={{
                                    fontSize: '18px',
                                    marginBottom: '1rem',
                                    color: '#e74c3c'
                                }}>
                                    Features
                                </h3>
                                <ul style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0
                                }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>🌍 International Barcode Scanning</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>🎤 Voice Input & Control</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>💰 Multi-Currency Price Tracking</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>⚖️ AI-Powered Recipe Scaling</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>📅 Intelligent Meal Planning</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>🥗 Comprehensive Nutrition Tracking</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Contact Info */}
                            <div>
                                <h3 style={{
                                    fontSize: '18px',
                                    marginBottom: '1rem',
                                    color: '#e74c3c'
                                }}>
                                    Contact
                                </h3>
                                <div style={{ color: '#bdc3c7', fontSize: '14px', lineHeight: '1.6' }}>
                                    <p style={{ margin: '0 0 0.5rem 0' }}>
                                        <strong>Doc Bear Enterprises, LLC.</strong>
                                    </p>
                                    <p style={{ margin: '0 0 0.5rem 0' }}>
                                        5249 N Park Pl NE<br/>
                                        PMB 4011<br/>
                                        Cedar Rapids, IA, USA<br/>
                                        Call: (319) 826-3463
                                    </p>
                                    <p style={{ margin: '0 0 0.5rem 0' }}>
                                        <a
                                                href="mailto:privacy@docbearscomfort.kitchen"
                                                style={{ color: '#e74c3c', textDecoration: 'none' }}
                                        >
                                            privacy@docbearscomfort.kitchen
                                        </a>
                                    </p>
                                    {/* EU-specific DPO contact */}
                                    {isEUUser && (
                                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: '#95a5a6' }}>
                                                EU Data Protection Officer:<br/>
                                                <a
                                                        href="mailto:dpo@docbearscomfort.kitchen"
                                                        style={{ color: '#e74c3c', textDecoration: 'none' }}
                                                >
                                                    dpo@docbearscomfort.kitchen
                                                </a>
                                            </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div style={{
                            borderTop: '1px solid #34495e',
                            paddingTop: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            <div className="footer-legal-links">
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <TouchEnhancedButton
                                            onClick={() => openModal('privacy')}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#bdc3c7',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                padding: '8px 4px',
                                                minHeight: '44px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                    >
                                        Privacy Policy
                                    </TouchEnhancedButton>

                                    <span style={{ color: '#7f8c8d' }}>•</span>

                                    <TouchEnhancedButton
                                            onClick={() => openModal('terms')}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#bdc3c7',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                padding: '8px 4px',
                                                minHeight: '44px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                    >
                                        Terms of Use (EULA)
                                    </TouchEnhancedButton>

                                    <span style={{ color: '#7f8c8d' }}>•</span>

                                    <TouchEnhancedButton
                                            onClick={() => openModal('about')}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#bdc3c7',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                padding: '8px 4px',
                                                minHeight: '44px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                    >
                                        About Us
                                    </TouchEnhancedButton>

                                    <span style={{ color: '#7f8c8d' }}>•</span>

                                    {/* Legal Information Page Link */}
                                    <TouchEnhancedButton
                                            onClick={() => router.push('/legal')}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#e74c3c',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                padding: '8px 4px',
                                                minHeight: '44px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                fontWeight: 'bold'
                                            }}
                                    >
                                        📋 Legal Information
                                    </TouchEnhancedButton>

                                    {/* Cookie Preferences for EU users */}
                                    {isEUUser && (
                                            <>
                                                <span style={{ color: '#7f8c8d' }}>•</span>
                                                <TouchEnhancedButton
                                                        onClick={() => setShowCookieConsent(true)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#bdc3c7',
                                                            fontSize: '14px',
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline',
                                                            padding: '8px 4px',
                                                            minHeight: '44px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                >
                                                    🍪 Cookie Preferences
                                                </TouchEnhancedButton>
                                            </>
                                    )}
                                </div>
                            </div>

                            {/* Copyright with compliance notice */}
                            <div style={{
                                textAlign: 'center',
                                color: '#7f8c8d',
                                fontSize: '12px'
                            }}>
                                <p style={{ margin: '0' }}>
                                    © {new Date().getFullYear()} Doc Bear Enterprises, LLC. All rights reserved.
                                </p>
                                <p style={{ margin: '0.5rem 0 0 0' }}>
                                    Making home cooking easier worldwide, one recipe at a time. 🍳🌍
                                </p>
                                {/* Compliance notice */}
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '11px', color: '#95a5a6' }}>
                                    International privacy compliance including GDPR, COPPA, and accessibility standards.
                                    {isEUUser && ' EU users have additional data protection rights under GDPR.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </footer>

                {/* Cookie Consent Component for EU Users */}
                {showCookieConsent && (
                        <CookieConsent
                                onAccept={() => setShowCookieConsent(false)}
                                onDecline={() => setShowCookieConsent(false)}
                                isEUUser={isEUUser}
                        />
                )}

                {/* Modals */}
                <Modal
                        isOpen={activeModal === 'privacy'}
                        onClose={closeModal}
                        title="Privacy Policy"
                >
                    <PrivacyPolicy />
                </Modal>

                <Modal
                        isOpen={activeModal === 'terms'}
                        onClose={closeModal}
                        title="Terms of Use"
                >
                    <TermsOfUse />
                </Modal>

                <Modal
                        isOpen={activeModal === 'about'}
                        onClose={closeModal}
                        title="About Us"
                >
                    <AboutUs />
                </Modal>

                {/* Accessibility and keyboard navigation improvements */}
                <style jsx>{`
                    .footer-legal-links button:focus {
                        outline: 2px solid #e74c3c;
                        outline-offset: 2px;
                        border-radius: 4px;
                    }

                    @media (max-width: 768px) {
                        .footer-legal-links > div {
                            flex-direction: column;
                            align-items: center;
                            gap: 0.25rem !important;
                        }

                        .footer-legal-links span {
                            display: none;
                        }
                    }
                `}</style>
            </>
    );
};

export default Footer;