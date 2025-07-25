// file: /src/components/legal/CookieConsent.jsx - Simplified EU Cookie Consent

import React from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

const CookieConsent = ({ onAccept, onDecline, isEUUser }) => {
    const handleAcceptAll = () => {
        localStorage.setItem('cookie-consent', JSON.stringify({
            necessary: true,
            functional: true,
            analytics: true,
            marketing: false, // You don't use marketing cookies
            timestamp: new Date().toISOString(),
            version: '1.0'
        }));
        onAccept();
    };

    const handleAcceptNecessaryOnly = () => {
        localStorage.setItem('cookie-consent', JSON.stringify({
            necessary: true,
            functional: false,
            analytics: false,
            marketing: false,
            timestamp: new Date().toISOString(),
            version: '1.0'
        }));
        onAccept();
    };

    return (
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'white',
                borderTop: '3px solid #4f46e5',
                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                padding: '1.5rem',
                maxHeight: '50vh',
                overflowY: 'auto'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        {/* Header */}
                        <div>
                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#1f2937',
                                margin: '0 0 0.5rem 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                🍪 Your Privacy Choices
                                {isEUUser && (
                                        <span style={{
                                            fontSize: '12px',
                                            backgroundColor: '#dbeafe',
                                            color: '#1e40af',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '12px',
                                            fontWeight: 'normal'
                                        }}>
                                    GDPR Protected
                                </span>
                                )}
                            </h3>
                            <p style={{
                                fontSize: '14px',
                                color: '#6b7280',
                                margin: '0',
                                lineHeight: '1.5'
                            }}>
                                We use cookies to enhance your experience with Doc Bear's Comfort Kitchen.
                                Essential cookies are required for voice input, barcode scanning, and core functionality.
                            </p>
                        </div>

                        {/* Cookie Types */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            fontSize: '12px',
                            color: '#6b7280'
                        }}>
                            <div>
                                <strong style={{ color: '#16a34a' }}>✓ Essential:</strong> Login, voice input, barcode scanning (Required)
                            </div>
                            <div>
                                <strong style={{ color: '#2563eb' }}>⚙️ Functional:</strong> Remember your preferences and settings
                            </div>
                            <div>
                                <strong style={{ color: '#7c3aed' }}>📊 Analytics:</strong> Anonymous usage data to improve the app
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}>
                            {/* Mobile-friendly button layout */}
                            <div style={{
                                display: 'flex',
                                flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                                gap: '0.75rem',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <TouchEnhancedButton
                                        onClick={handleAcceptNecessaryOnly}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: '#6b7280',
                                            backgroundColor: 'white',
                                            border: '2px solid #d1d5db',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            minWidth: '140px',
                                            width: window.innerWidth < 640 ? '100%' : 'auto'
                                        }}
                                >
                                    Essential Only
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                        onClick={handleAcceptAll}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: 'white',
                                            backgroundColor: '#4f46e5',
                                            border: '2px solid #4f46e5',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            minWidth: '140px',
                                            width: window.innerWidth < 640 ? '100%' : 'auto'
                                        }}
                                >
                                    Accept All Cookies
                                </TouchEnhancedButton>
                            </div>

                            {/* Privacy links */}
                            <div style={{
                                textAlign: 'center',
                                fontSize: '12px',
                                color: '#9ca3af'
                            }}>
                            <span>
                                By continuing, you agree to our{' '}
                                <a href="/privacy" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
                                    Privacy Policy
                                </a>
                                {' '}and{' '}
                                <a href="/terms" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
                                    Terms of Use
                                </a>
                                {isEUUser && (
                                        <>
                                            <br/>
                                            <span style={{ color: '#7c3aed' }}>
                                            🇪🇺 EU users have additional rights under GDPR
                                        </span>
                                        </>
                                )}
                            </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default CookieConsent;