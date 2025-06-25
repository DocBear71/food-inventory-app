'use client';
// file: /src/components/layout/MobileDashboardLayout.js v6 - Fixed sign-out functionality with proper session clearing

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

        window.addEventListener('scroll', handleScroll, {passive: true});
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
        {name: 'Dashboard', href: '/', icon: '🏠', current: pathname === '/'},
        {name: 'Inventory', href: '/inventory', icon: '📦', current: pathname === '/inventory'},
        {name: 'Recipes', href: '/recipes', icon: '📖', current: pathname.startsWith('/recipes')},
        {name: 'Meal Planning', href: '/meal-planning', icon: '📅', current: pathname.startsWith('/meal-planning')},
        {name: 'Shopping Lists', href: '/shopping', icon: '🛒', current: pathname.startsWith('/shopping')},
    ];

    // Additional menu items for hamburger menu only - UPDATED: Added Receipt Scanner
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
            current: false, // This doesn't have its own page, it's a modal
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

    // Add this to your mobile layout or create a settings page
    const clearPWACache = async () => {
        try {
            // Clear service worker caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }

            // Clear localStorage and sessionStorage
            localStorage.clear();
            sessionStorage.clear();

            // Force reload
            window.location.reload();
        } catch (error) {
            console.error('Error clearing PWA cache:', error);
        }
    };

    const handleNavigation = (href) => {
        MobileHaptics.light();
        router.push(href);
    };

    const toggleMobileMenu = () => {
        MobileHaptics.medium();
        setMobileMenuOpen(!mobileMenuOpen);
    };

    // FIXED: Enhanced mobile sign-out that properly handles PWA environments
    const handleSignOut = async () => {
        if (isSigningOut) return; // Prevent double-clicks

        try {
            setIsSigningOut(true);
            MobileHaptics?.medium(); // Only call if available
            setMobileMenuOpen(false); // Close mobile menu

            console.log('Mobile dashboard sign-out initiated');

            // Use the specialized mobile sign-out handler
            await handleMobileSignOut({
                callbackUrl: '/'
            });

        } catch (error) {
            console.error('Mobile dashboard sign-out error:', error);
            setIsSigningOut(false);

            // Emergency fallback
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (storageError) {
                console.log('Emergency storage clear failed:', storageError);
            }

            window.location.href = '/';
        }
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M4 6h16M4 12h16M4 18h16"/>
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
                        {/* Receipt Scanner Button */}
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/inventory/receipt-scan')}
                            className="p-2 rounded-lg bg-purple-600 text-white shadow-md hover:bg-purple-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Scan receipt"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </TouchEnhancedButton>

                        {/* Quick add Button */}
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/inventory?action=add')}
                            className="p-2 rounded-lg bg-green-600 text-white shadow-md hover:bg-green-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Quick add item"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
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
                                    src={`/api/user/avatar/${session.user.avatar}`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback if image fails to load
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <span
                                className="text-indigo-600 text-sm font-medium"
                                style={{display: session?.user?.avatar ? 'none' : 'flex'}}
                            >
        {session?.user?.name?.[0]?.toUpperCase() || 'U'}
    </span>
                        </TouchEnhancedButton>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}/>
                    <div className="fixed top-0 left-0 bottom-0 w-80 max-w-sm bg-white shadow-xl flex flex-col">
                        {/* Menu Header - Fixed */}
                        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                            <TouchEnhancedButton
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </TouchEnhancedButton>
                        </div>

                        {/* Scrollable Navigation Content */}
                        <div className="flex-1 overflow-y-auto">
                            <nav className="px-4 py-6 space-y-2">
                                {/* Main navigation items */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
                                        Main Navigation
                                    </h3>
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
                                                <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full"/>
                                            )}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>

                                {/* Additional menu items - UPDATED: Now includes Receipt Scanner */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
                                        Tools & Features
                                    </h3>
                                    {additionalMenuItems.map((item) => (
                                        <TouchEnhancedButton
                                            key={item.name}
                                            onClick={() => handleNavigation(item.href)}
                                            className={`w-full flex items-start space-x-3 px-4 py-3 rounded-lg text-left transition-all touch-friendly ${
                                                item.current
                                                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500'
                                                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                                            }`}
                                        >
                                            <span className="text-xl mt-0.5">{item.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium">{item.name}</div>
                                                {item.description && (
                                                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                                )}
                                            </div>
                                            {item.current && (
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"/>
                                            )}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>

                                {/* Add some bottom padding to ensure last items are accessible */}
                                <div className="h-4"></div>
                            </nav>
                        </div>

                        {/* User Profile & Sign Out Section - Fixed at bottom */}
                        <div className="border-t bg-gray-50 flex-shrink-0">
                            {/* User Info */}
                            {session && (
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden">
                                            {session?.user?.avatar ? (
                                                <img
                                                    src={`/api/user/avatar/${session.user.avatar}`}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextElementSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <span
                                                className="text-indigo-600 text-sm font-medium"
                                                style={{display: session?.user?.avatar ? 'none' : 'flex'}}
                                            >
                                                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                {session.user.name}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {session.user.email}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="p-4 space-y-2">
                                <TouchEnhancedButton
                                    onClick={() => handleNavigation('/profile')}
                                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all touch-friendly"
                                >
                                    <span className="text-xl">⚙️</span>
                                    <span className="font-medium">Profile Settings</span>
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={handleSignOut}
                                    disabled={isSigningOut}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all touch-friendly ${
                                        isSigningOut
                                            ? 'text-white bg-gray-400 cursor-not-allowed'
                                            : 'text-white bg-red-600 hover:bg-red-700 active:bg-red-800'
                                    }`}
                                >
                                    <span className="text-xl">{isSigningOut ? '⏳' : '🚪'}</span>
                                    <span className="font-medium">{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content - Right amount of padding to clear header */}
            <main className="mobile-main-content"
                  style={{paddingTop: '20px', paddingBottom: showPWABanner ? '128px' : '80px'}}>
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
                                <div
                                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-indigo-600 rounded-t-full"/>
                            )}
                        </TouchEnhancedButton>
                    ))}
                </div>
            </nav>
            {/* PWA Install Banner - back at bottom */}
            <PWAInstallBanner/>
        </div>
    );
}