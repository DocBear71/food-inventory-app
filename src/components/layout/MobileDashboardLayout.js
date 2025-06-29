'use client';
// file: src/components/layout/MobileDashboardLayout.js v7 - Fixed stacking and positioning issues

import {useState, useEffect} from 'react';
import { handleMobileSignOut } from '@/lib/mobile-signout';
import { useSafeSession } from '@/hooks/useSafeSession';
import {useRouter, usePathname} from 'next/navigation';
import {PWAInstallBanner} from '@/components/mobile/PWAInstallBanner';
import {MobileHaptics} from '@/components/mobile/MobileHaptics';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function MobileDashboardLayout({children}) {
    const {data: session} = useSafeSession();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showPWABanner, setShowPWABanner] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    // Handle scroll state for header styling
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        const mainContent = document.querySelector('.mobile-main-content');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll, {passive: true});
            return () => mainContent.removeEventListener('scroll', handleScroll);
        }
    }, []);

    // Check if PWA banner should be shown
    useEffect(() => {
        const checkPWABanner = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone ||
                document.referrer.includes('android-app://');
            const wasDismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true';

            setShowPWABanner(!isStandalone && !wasDismissed);
        };

        checkPWABanner();
    }, []);

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const navigation = [
        {name: 'Dashboard', href: '/', icon: '🏠', current: pathname === '/'},
        {name: 'Inventory', href: '/inventory', icon: '📦', current: pathname === '/inventory'},
        {name: 'Recipes', href: '/recipes', icon: '📖', current: pathname.startsWith('/recipes')},
        {name: 'Meal Planning', href: '/meal-planning', icon: '📅', current: pathname.startsWith('/meal-planning')},
        {name: 'Shopping Lists', href: '/shopping', icon: '🛒', current: pathname.startsWith('/shopping')},
    ];

    const additionalMenuItems = [
        {
            name: 'Receipt Scanner',
            href: '/inventory/receipt-scan',
            icon: '📄',
            current: pathname === '/inventory/receipt-scan',
            description: 'Scan receipts to quickly add multiple items to inventory'
        },
        {
            name: 'Common Items Wizard',
            href: '/inventory?wizard=true',
            icon: '🏠',
            current: false,
            description: 'Quickly add common household items to your inventory'
        },
        {
            name: 'What Can I Make?',
            href: '/recipes/suggestions',
            icon: '💡',
            current: pathname === '/recipes/suggestions',
            description: 'Find recipes based on your inventory'
        }
    ];

    const handleNavigation = (href) => {
        MobileHaptics.light();
        router.push(href);
    };

    const toggleMobileMenu = () => {
        MobileHaptics.medium();
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const handleSignOut = async () => {
        if (isSigningOut) return;

        try {
            setIsSigningOut(true);
            MobileHaptics?.medium();
            setMobileMenuOpen(false);

            console.log('Mobile dashboard sign-out initiated');
            await handleMobileSignOut({
                callbackUrl: '/'
            });

        } catch (error) {
            console.error('Mobile dashboard sign-out error:', error);
            setIsSigningOut(false);

            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (storageError) {
                console.log('Emergency storage clear failed:', storageError);
            }

            window.location.href = '/';
        }
    };

    return (
        <div className="mobile-dashboard-container">
            {/* Mobile Header */}
            <header className={`mobile-header ${isScrolled ? 'scrolled' : ''}`}>
                <div className="header-content">
                    <div className="header-left">
                        <TouchEnhancedButton
                            onClick={toggleMobileMenu}
                            className="menu-button"
                            aria-label="Open menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </TouchEnhancedButton>

                        <div className="app-title">
                            <div className="title-main">Doc Bear's</div>
                            <div className="title-sub">Comfort Kitchen</div>
                        </div>
                    </div>

                    <div className="header-right">
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/inventory/receipt-scan')}
                            className="action-button receipt-button"
                            aria-label="Scan receipt"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/inventory?action=add')}
                            className="action-button add-button"
                            aria-label="Quick add item"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/profile')}
                            className="profile-button"
                            aria-label="Go to profile"
                            title="Profile"
                        >
                            {session?.user?.avatar ? (
                                <img
                                    src={`/api/user/avatar/${session.user.avatar}`}
                                    alt="Profile"
                                    className="profile-image"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <span className={`profile-fallback ${session?.user?.avatar ? 'hidden' : 'visible'}`}>
                                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </TouchEnhancedButton>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="mobile-menu-overlay">
                    <div className="menu-backdrop" onClick={() => setMobileMenuOpen(false)}/>
                    <div className="menu-panel">
                        {/* Menu Header */}
                        <div className="menu-header">
                            <h2 className="menu-title">Menu</h2>
                            <TouchEnhancedButton
                                onClick={() => setMobileMenuOpen(false)}
                                className="menu-close"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </TouchEnhancedButton>
                        </div>

                        {/* Menu Content */}
                        <div className="menu-content">
                            <nav className="menu-nav">
                                {/* Main navigation */}
                                <div className="nav-section">
                                    <h3 className="nav-section-title">Main Navigation</h3>
                                    {navigation.map((item) => (
                                        <TouchEnhancedButton
                                            key={item.name}
                                            onClick={() => handleNavigation(item.href)}
                                            className={`nav-item ${item.current ? 'current' : ''}`}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            <span className="nav-text">{item.name}</span>
                                            {item.current && <div className="nav-indicator"/>}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>

                                {/* Additional menu items */}
                                <div className="nav-section">
                                    <h3 className="nav-section-title">Tools & Features</h3>
                                    {additionalMenuItems.map((item) => (
                                        <TouchEnhancedButton
                                            key={item.name}
                                            onClick={() => handleNavigation(item.href)}
                                            className={`nav-item detailed ${item.current ? 'current' : ''}`}
                                        >
                                            <span className="nav-icon">{item.icon}</span>
                                            <div className="nav-text-container">
                                                <div className="nav-text">{item.name}</div>
                                                {item.description && (
                                                    <div className="nav-description">{item.description}</div>
                                                )}
                                            </div>
                                            {item.current && <div className="nav-indicator"/>}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </nav>
                        </div>

                        {/* Menu Footer */}
                        <div className="menu-footer">
                            {session && (
                                <div className="user-info">
                                    <div className="user-avatar">
                                        {session?.user?.avatar ? (
                                            <img
                                                src={`/api/user/avatar/${session.user.avatar}`}
                                                alt="Profile"
                                                className="avatar-image"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <span className="avatar-fallback">
                                                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="user-details">
                                        <div className="user-name">{session.user.name}</div>
                                        <div className="user-email">{session.user.email}</div>
                                    </div>
                                </div>
                            )}

                            <div className="footer-actions">
                                <TouchEnhancedButton
                                    onClick={() => handleNavigation('/account')}
                                    className="footer-button settings"
                                >
                                    <span className="button-icon">⚙️</span>
                                    <span className="button-text">Account Settings</span>
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={handleSignOut}
                                    disabled={isSigningOut}
                                    className={`footer-button signout ${isSigningOut ? 'disabled' : ''}`}
                                >
                                    <span className="button-icon">{isSigningOut ? '⏳' : '🚪'}</span>
                                    <span className="button-text">{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="mobile-main-content">
                <div className="content-wrapper">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-navigation">
                <div className="bottom-nav-grid">
                    {navigation.map((item) => (
                        <TouchEnhancedButton
                            key={item.name}
                            onClick={() => handleNavigation(item.href)}
                            className={`bottom-nav-item ${item.current ? 'current' : ''}`}
                        >
                            <span className="bottom-nav-icon">{item.icon}</span>
                            <span className="bottom-nav-text">{item.name}</span>
                            {item.current && <div className="bottom-nav-indicator"/>}
                        </TouchEnhancedButton>
                    ))}
                </div>
            </nav>

            {/* PWA Install Banner */}
            <PWAInstallBanner/>

            <style jsx>{`
                .mobile-dashboard-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    background: #f9fafb;
                    z-index: 1;
                }

                .mobile-header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 64px;
                    background: white;
                    border-bottom: 1px solid #e5e7eb;
                    z-index: 40;
                    transition: all 0.2s;
                }

                .mobile-header.scrolled {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(12px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    height: 100%;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                    min-width: 0;
                }

                .menu-button {
                    padding: 8px;
                    border-radius: 8px;
                    background: #4f46e5;
                    color: white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s;
                    flex-shrink: 0;
                }

                .menu-button:hover {
                    background: #4338ca;
                }

                .app-title {
                    flex: 1;
                    min-width: 0;
                }

                .title-main {
                    font-size: 18px;
                    font-weight: 700;
                    color: #111827;
                    line-height: 1.2;
                }

                .title-sub {
                    font-size: 14px;
                    font-weight: 600;
                    color: #374151;
                    line-height: 1.2;
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .action-button {
                    padding: 8px;
                    border-radius: 8px;
                    color: white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s;
                }

                .receipt-button {
                    background: #7c3aed;
                }

                .receipt-button:hover {
                    background: #6d28d9;
                }

                .add-button {
                    background: #059669;
                }

                .add-button:hover {
                    background: #047857;
                }

                .profile-button {
                    width: 40px;
                    height: 40px;
                    background: #e0e7ff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    position: relative;
                    transition: all 0.2s;
                }

                .profile-button:hover {
                    background: #c7d2fe;
                }

                .profile-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 50%;
                }

                .profile-fallback {
                    color: #4f46e5;
                    font-size: 14px;
                    font-weight: 600;
                }

                .profile-fallback.hidden {
                    display: none;
                }

                .profile-fallback.visible {
                    display: flex;
                }

                .mobile-main-content {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                    padding-top: 64px;
                    padding-bottom: 64px;
                    position: relative;
                    background: #f9fafb;
                }

                .content-wrapper {
                    max-width: 1280px;
                    margin: 0 auto;
                    padding: 24px 16px;
                    min-height: calc(100vh - 128px);
                }

                .bottom-navigation {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 64px;
                    background: white;
                    border-top: 1px solid #e5e7eb;
                    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
                    z-index: 30;
                }

                .bottom-nav-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    height: 100%;
                }

                .bottom-nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    transition: all 0.2s;
                    position: relative;
                    color: #9ca3af;
                }

                .bottom-nav-item.current {
                    color: #4f46e5;
                    background: #f0f3ff;
                }

                .bottom-nav-item:hover {
                    color: #6b7280;
                }

                .bottom-nav-icon {
                    font-size: 18px;
                }

                .bottom-nav-text {
                    font-size: 10px;
                    font-weight: 600;
                    text-align: center;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    padding: 0 4px;
                }

                .bottom-nav-indicator {
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 32px;
                    height: 4px;
                    background: #4f46e5;
                    border-radius: 2px 2px 0 0;
                }

                /* Mobile Menu Styles */
                .mobile-menu-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 50;
                }

                .menu-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                }

                .menu-panel {
                    position: fixed;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    width: 320px;
                    max-width: calc(100vw - 40px);
                    background: white;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
                    display: flex;
                    flex-direction: column;
                }

                .menu-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    flex-shrink: 0;
                }

                .menu-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #111827;
                }

                .menu-close {
                    padding: 8px;
                    border-radius: 8px;
                    color: #9ca3af;
                    transition: all 0.2s;
                }

                .menu-close:hover {
                    color: #6b7280;
                    background: #f3f4f6;
                }

                .menu-content {
                    flex: 1;
                    overflow-y: auto;
                }

                .menu-nav {
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .nav-section-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 12px;
                    padding: 0 16px;
                }

                .nav-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    text-align: left;
                    transition: all 0.2s;
                    color: #374151;
                    position: relative;
                }

                .nav-item:hover {
                    background: #f3f4f6;
                }

                .nav-item.current {
                    background: #f0f3ff;
                    color: #4f46e5;
                    border-left: 4px solid #4f46e5;
                }

                .nav-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                }

                .nav-text {
                    font-weight: 600;
                }

                .nav-text-container {
                    flex: 1;
                    min-width: 0;
                }

                .nav-description {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 2px;
                }

                .nav-indicator {
                    width: 8px;
                    height: 8px;
                    background: #4f46e5;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .menu-footer {
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                    flex-shrink: 0;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .user-avatar {
                    width: 40px;
                    height: 40px;
                    background: #e0e7ff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .avatar-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 50%;
                }

                .avatar-fallback {
                    color: #4f46e5;
                    font-size: 14px;
                    font-weight: 600;
                }

                .user-details {
                    flex: 1;
                    min-width: 0;
                }

                .user-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #111827;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .user-email {
                    font-size: 12px;
                    color: #6b7280;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .footer-actions {
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .footer-button {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    transition: all 0.2s;
                }

                .footer-button.settings {
                    color: #374151;
                    background: transparent;
                }

                .footer-button.settings:hover {
                    background: #f3f4f6;
                }

                .footer-button.signout {
                    color: white;
                    background: #dc2626;
                }

                .footer-button.signout:hover {
                    background: #b91c1c;
                }

                .footer-button.signout.disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                }

                .button-icon {
                    font-size: 20px;
                }

                .button-text {
                    font-weight: 600;
                }

                /* Responsive adjustments */
                @media (max-width: 640px) {
                    .menu-panel {
                        width: 280px;
                    }
                    
                    .content-wrapper {
                        padding: 16px 12px;
                    }
                }
            `}</style>
        </div>
    );
}