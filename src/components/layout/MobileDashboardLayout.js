// file: /src/components/layout/MobileDashboardLayout.js - Enhanced mobile layout with PWA banner support
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { PWAInstallBanner } from '@/components/mobile/PWAInstallBanner';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function MobileDashboardLayout({ children }) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showPWABanner, setShowPWABanner] = useState(false);

    // Handle scroll state for header styling
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Check if PWA banner should be shown
    useEffect(() => {
        const checkPWABanner = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone ||
                document.referrer.includes('android-app://');
            const wasDismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true';

            // Show banner if not standalone and not dismissed
            setShowPWABanner(!isStandalone && !wasDismissed);
        };

        checkPWABanner();
    }, []);

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: '🏠', current: pathname === '/' },
        { name: 'Inventory', href: '/inventory', icon: '📦', current: pathname === '/inventory' },
        { name: 'Recipes', href: '/recipes', icon: '📖', current: pathname.startsWith('/recipes') },
        { name: 'Meal Planning', href: '/meal-planning', icon: '📅', current: pathname.startsWith('/meal-planning') },
        { name: 'Shopping Lists', href: '/shopping', icon: '🛒', current: pathname.startsWith('/shopping') },
    ];

    const handleNavigation = (href) => {
        MobileHaptics.light();
        router.push(href);
    };

    const toggleMobileMenu = () => {
        MobileHaptics.medium();
        setMobileMenuOpen(!mobileMenuOpen);
    };

    // Calculate bottom padding based on whether PWA banner is shown
    const bottomPadding = showPWABanner ? 'pb-32' : 'pb-20'; // pb-32 = bottom nav (64px) + banner (64px), pb-20 = just bottom nav

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header - back at top */}
            <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
                isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white'
            }`}>
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <TouchEnhancedButton
                            onClick={toggleMobileMenu}
                            className="p-2 rounded-lg bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all touch-friendly flex-shrink-0"
                            aria-label="Open menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </TouchEnhancedButton>

                        {/* Two-line title */}
                        <div className="flex-1 min-w-0">
                            <div className="text-lg font-bold text-gray-900 leading-tight">
                                Doc Bear's
                            </div>
                            <div className="text-sm font-semibold text-gray-700 leading-tight">
                                Comfort Kitchen
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* Quick add Button */}
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/inventory?action=add')}
                            className="p-2 rounded-lg bg-green-600 text-white shadow-md hover:bg-green-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Quick add item"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </TouchEnhancedButton>

                        {/* User avatar with profile link */}
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/profile')}
                            className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all touch-friendly overflow-hidden"
                            aria-label="Go to profile"
                            title="Profile"
                        >
                            {session?.user?.avatar ? (
                                <img
                                    src={session.user.avatar}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-indigo-600 text-sm font-medium">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
        </span>
                            )}
                        </TouchEnhancedButton>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
                    <div className="fixed top-0 left-0 bottom-0 w-80 max-w-sm bg-white shadow-xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                            <TouchEnhancedButton
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </TouchEnhancedButton>
                        </div>

                        <nav className="px-4 py-6 space-y-2">
                            {navigation.map((item) => (
                                <TouchEnhancedButton
                                    key={item.name}
                                    onClick={() => handleNavigation(item.href)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all touch-friendly ${
                                        item.current
                                            ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500'
                                            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                                    }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.name}</span>
                                    {item.current && (
                                        <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full" />
                                    )}
                                </TouchEnhancedButton>
                            ))}
                        </nav>

                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
                            <TouchEnhancedButton
                                onClick={() => handleNavigation('/profile')}
                                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all touch-friendly"
                            >
                                <span className="text-xl">⚙️</span>
                                <span className="font-medium">Profile Settings</span>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content - Right amount of padding to clear header */}
            <main className="mobile-main-content" style={{ paddingTop: '20px', paddingBottom: showPWABanner ? '128px' : '80px' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30">
                <div className="grid grid-cols-5 h-16">
                    {navigation.map((item) => (
                        <TouchEnhancedButton
                            key={item.name}
                            onClick={() => handleNavigation(item.href)}
                            className={`flex flex-col items-center justify-center space-y-1 transition-all touch-friendly ${
                                item.current
                                    ? 'text-indigo-600 bg-indigo-50'
                                    : 'text-gray-400 hover:text-gray-600 active:bg-gray-100'
                            }`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-xs font-medium truncate max-w-full px-1">
                {item.name}
              </span>
                            {item.current && (
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-indigo-600 rounded-t-full" />
                            )}
                        </TouchEnhancedButton>
                    ))}
                </div>
            </nav>
            {/* PWA Install Banner - back at bottom */}
            <PWAInstallBanner />
        </div>
    );
}