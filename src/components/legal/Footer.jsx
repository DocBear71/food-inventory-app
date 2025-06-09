// file: src/components/legal/Footer.jsx v1

import React, { useState } from 'react';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfUse from './TermsOfUse';
import AboutUs from './AboutUs';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

const Footer = () => {
    const [activeModal, setActiveModal] = useState(null);

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
                                    Doc Bear's Comfort Food
                                </h3>
                                <p style={{
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    color: '#bdc3c7',
                                    margin: '0 0 1rem 0'
                                }}>
                                    Your personal food inventory and recipe management solution.
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
                  🏠 Inventory Management
                </span>
                                    <span style={{
                                        backgroundColor: '#34495e',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#ecf0f1'
                                    }}>
                  👨‍🍳 Recipe Discovery
                </span>
                                    <span style={{
                                        backgroundColor: '#34495e',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#ecf0f1'
                                    }}>
                  📱 Multi-Device
                </span>
                                </div>
                            </div>

                            {/* Quick Links */}
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
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>📋 Smart Shopping Lists</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>🎯 Recipe Matching</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>📅 Meal Planning</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>🥗 Nutritional Info</span>
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#bdc3c7', fontSize: '14px' }}>📱 UPC Scanning</span>
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
                                        3920 Lennox Ave NE<br/>
                                        Cedar Rapids, IA 52402
                                    </p>
                                    <p style={{ margin: '0' }}>
                                        <a
                                                href="mailto:privacy@docbear-ent.com"
                                                style={{ color: '#e74c3c', textDecoration: 'none' }}
                                        >
                                            privacy@docbear-ent.com
                                        </a>
                                    </p>
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
                            {/* Legal Links */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '2rem',
                                flexWrap: 'wrap'
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
                                            padding: '0'
                                        }}
                                >
                                    Privacy Policy
                                </TouchEnhancedButton>
                                <span style={{ color: '#7f8c8d' }}>|</span>
                                <TouchEnhancedButton
                                        onClick={() => openModal('terms')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#bdc3c7',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            padding: '0'
                                        }}
                                >
                                    Terms of Use
                                </TouchEnhancedButton>
                                <span style={{ color: '#7f8c8d' }}>|</span>
                                <TouchEnhancedButton
                                        onClick={() => openModal('about')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#bdc3c7',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            padding: '0'
                                        }}
                                >
                                    About Us
                                </TouchEnhancedButton>
                            </div>

                            {/* Copyright */}
                            <div style={{
                                textAlign: 'center',
                                color: '#7f8c8d',
                                fontSize: '12px'
                            }}>
                                <p style={{ margin: '0' }}>
                                    © {new Date().getFullYear()} Doc Bear Enterprises, LLC. All rights reserved.
                                </p>
                                <p style={{ margin: '0.5rem 0 0 0' }}>
                                    Making home cooking easier, one recipe at a time. 🍳
                                </p>
                            </div>
                        </div>
                    </div>
                </footer>

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
            </>
    );
};

export default Footer;