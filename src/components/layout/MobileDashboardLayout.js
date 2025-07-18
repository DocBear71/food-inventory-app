'use client';
// file: /src/components/layout/MobileDashboardLayout.js v8 - Cleaned up admin clutter

import {useState, useEffect} from 'react';
import {handleMobileSignOut} from '@/lib/mobile-signout';
import {useSafeSession} from '@/hooks/useSafeSession';
import {useRouter, usePathname, useSearchParams} from 'next/navigation';
import {PWAInstallBanner} from '@/components/mobile/PWAInstallBanner';
import {MobileHaptics} from '@/components/mobile/MobileHaptics';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {getApiUrl} from "@/lib/api-config";
import {Capacitor} from "@capacitor/core";
import VerificationBanner from '@/components/auth/VerificationBanner';
import Link from 'next/link';

export default function MobileDashboardLayout({children}) {
    const {data: session} = useSafeSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showPWABanner, setShowPWABanner] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    // Check if user is admin
    const isAdmin = session?.user?.isAdmin || session?.user?.email === 'e.g.mckeown@gmail.com';

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
    }, [pathname, searchParams]);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: '🏠', current: pathname === '/' },
        { name: 'Inventory', href: '/inventory', icon: '📦', current: pathname === '/inventory' },
        { name: 'Nutrition', href: '/dashboard/nutrition', icon: '🔬', current: pathname.startsWith('/dashboard/nutrition') },
        { name: 'Recipes', href: '/recipes', icon: '📖', current: pathname.startsWith('/recipes') },
        { name: 'Shopping', href: '/shopping', icon: '🛒', current: pathname.startsWith('/shopping') },
    ];

// Enhanced additional menu items for hamburger menu - UPDATED: Added Shopping List Features
    const additionalMenuItems = [
        // Inventory Section
        {
            name: 'Receipt Scanner',
            href: '/inventory/receipt-scan',
            icon: '📄',
            current: pathname === '/inventory/receipt-scan',
            description: 'Scan receipts to quickly add multiple items to inventory',
            section: 'Inventory'
        },
        {
            name: 'Common Items Wizard',
            href: '/inventory?wizard=true',
            icon: '🏠',
            current: false,
            description: 'Quickly add common household items to your inventory',
            section: 'Inventory'
        },
        {
            name: 'My Stores',
            href: '/stores',
            icon: '🏪',
            current: pathname === '/stores',
            description: 'Manage your favorite stores for price tracking',
            section: 'Inventory'
        },

        {
            name: 'Nutrition Dashboard',
            href: '/dashboard/nutrition',
            icon: '📊',
            current: pathname === '/dashboard/nutrition',
            description: 'AI-powered nutrition analysis and insights',
            section: 'Nutrition'
        },
        {
            name: 'AI Nutrition Analysis',
            href: '/dashboard/nutrition?tab=inventory',
            icon: '🤖',
            current: pathname === '/dashboard/nutrition' && searchParams.get('tab') === 'inventory',
            description: 'Analyze your inventory nutrition with AI',
            section: 'Nutrition'
        },
        {
            name: 'Meal Plan Nutrition',
            href: '/dashboard/nutrition?tab=mealplans',
            icon: '📅',
            current: pathname === '/dashboard/nutrition' && searchParams.get('tab') === 'mealplans',
            description: 'Track nutrition across your meal plans',
            section: 'Nutrition'
        },
        {
            name: 'Nutrition Goals',
            href: '/dashboard/nutrition?tab=goals',
            icon: '🎯',
            current: pathname === '/dashboard/nutrition' && searchParams.get('tab') === 'goals',
            description: 'Set and track your nutrition goals',
            section: 'Nutrition'
        },

        // Shopping List Section - NEW
        {
            name: 'Add Items to Shopping List',
            href: '/shopping/add-items',
            icon: '🛒',
            current: pathname === '/shopping/add-items' && !searchParams.get('tab'),
            description: 'Add items from inventory, recently used, or create new ones',
            section: 'Shopping'
        },
        {
            name: 'Recently Used Items',
            href: '/shopping/add-items?tab=consumed',
            icon: '🔄',
            current: pathname === '/shopping/add-items' && searchParams.get('tab') === 'consumed',
            description: 'Re-add items you\'ve consumed in the last 30-90 days',
            section: 'Shopping'
        },
        {
            name: 'Quick Add New Items',
            href: '/shopping/add-items?tab=manual',
            icon: '✏️',
            current: pathname === '/shopping/add-items' && searchParams.get('tab') === 'manual',
            description: 'Manually add items that aren\'t in your inventory',
            section: 'Shopping'
        },
        {
            name: 'Saved Shopping Lists',
            href: '/shopping/saved',
            icon: '💾',
            current: pathname === '/shopping/saved',
            description: 'View and manage your saved shopping lists',
            section: 'Shopping'
        },

        // Recipe Section
        {
            name: 'What Can I Make?',
            href: '/recipes/suggestions',
            icon: '💡',
            current: pathname === '/recipes/suggestions',
            description: 'Find recipes based on your inventory',
            section: 'Recipes'
        }
    ];

    // ADMIN MENU ITEMS - Only visible to admin users
    const adminMenuItems = [
        {
            name: 'User Management',
            href: '/admin/users',
            icon: '👥',
            current: pathname.startsWith('/admin/users'),
            description: 'Manage users, subscriptions, and permissions'
        },
        {
            name: 'Analytics Dashboard',
            href: '/admin/analytics',
            icon: '📊',
            current: pathname === '/admin/analytics',
            description: 'View platform usage statistics and insights'
        },
        {
            name: 'Bulk Recipe Import',
            href: '/recipes/admin',
            icon: '📚',
            current: pathname === '/recipes/admin',
            description: 'Import recipes from Doc Bear\'s Comfort Food Survival Guide'
        },
        {
            name: 'Admin Settings',
            href: '/admin/settings',
            icon: '🔧',
            current: pathname === '/admin/settings',
            description: 'System configuration and admin tools'
        }
    ];

    const handleNavigation = (href) => {
        MobileHaptics.light();

        // ALWAYS close the mobile menu when navigating
        setMobileMenuOpen(false);

        // Navigate to the new route
        router.push(href);
    };

    const toggleMobileMenu = () => {
        MobileHaptics.medium();
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const getGroupedMenuItems = () => {
        return additionalMenuItems.reduce((acc, item) => {
            const section = item.section || 'Other';
            if (!acc[section]) acc[section] = [];
            acc[section].push(item);
            return acc;
        }, {});
    };

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
            {/* Mobile Header - CLEANED UP */}
            <header className={`fixed left-0 right-0 z-40 transition-all duration-200 ${
                isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white'
            }`}
                    style={{
                        top: Capacitor.isNativePlatform() ? '32px' : '0',  // Push below status bar
                        paddingTop: Capacitor.isNativePlatform() ? '8px' : '0'  // Extra breathing room
                    }}
            >
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <TouchEnhancedButton
                            onClick={toggleMobileMenu}
                            className="p-2 rounded-lg shadow-md bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all touch-friendly flex-shrink-0"
                            aria-label="Open menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </TouchEnhancedButton>

                        {/* Clean two-line title */}
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

                        {/* NEW: Shopping List Quick Action Button */}
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/shopping/add-items')}
                            className="p-2 rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Add to shopping list"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h12.2M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z"/>
                            </svg>
                        </TouchEnhancedButton>

                        {/* Quick add Button */}
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/inventory?action=add&scroll=form')}
                            className="p-2 rounded-lg bg-green-600 text-white shadow-md hover:bg-green-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Quick add item"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                        </TouchEnhancedButton>

                        {/* User avatar with profile link - CLEANED UP */}
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/profile')}
                            className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all touch-friendly overflow-hidden flex-shrink-0 relative"
                            aria-label="Go to profile"
                            title="Profile"
                        >
                            {session?.user?.avatar ? (
                                <img
                                    src={getApiUrl(`/api/user/avatar/${session.user.avatar}`)}
                                    alt="Profile"
                                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                                    onError={(e) => {
                                        // Fallback if image fails to load
                                        e.target.style.display = 'none';
                                        e.target.parentElement.classList.add('show-fallback');
                                    }}
                                />
                            ) : null}
                            <span
                                className={`text-indigo-600 text-sm font-medium w-full h-full flex items-center justify-center ${
                                    session?.user?.avatar ? 'hidden' : 'block'
                                }`}
                            >
                            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                        </span>
                        </TouchEnhancedButton>
                    </div>
                </div>
            </header>

            {/* Verification Banner */}
            {session?.user && !session.user.emailVerified && (
                <VerificationBanner user={session.user} />
            )}

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}/>
                    <div className="fixed top-0 left-0 bottom-0 w-80 max-w-sm bg-white shadow-xl flex flex-col">
                        {/* Menu Header - CLEANED UP */}
                        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
                            <div className="flex items-center space-x-2">
                                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                            </div>
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

                                {/* Enhanced Additional menu items - NOW WITH SECTIONS */}
                                {(() => {
                                    const groupedItems = getGroupedMenuItems();
                                    return Object.entries(groupedItems).map(([sectionName, items]) => (
                                        <div key={sectionName} className="mb-6">
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
                                                {sectionName === 'Inventory' && '📦 '}
                                                {sectionName === 'Shopping' && '🛒 '}
                                                {sectionName === 'Recipes' && '🍳 '}
                                                {sectionName}
                                            </h3>
                                            {items.map((item) => (
                                                <TouchEnhancedButton
                                                    key={item.name}
                                                    onClick={() => {
                                                        MobileHaptics.light();
                                                        setMobileMenuOpen(false); // Force close menu

                                                        // Small delay to ensure menu closes before navigation
                                                        setTimeout(() => {
                                                            router.push(item.href);
                                                        }, 100);
                                                    }}
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
                                    ));
                                })()}

                                {/* ADMIN SECTION - Only show for admin users */}
                                {isAdmin && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-3 px-4">
                                            🔒 Admin Panel
                                        </h3>
                                        {adminMenuItems.map((item) => (
                                            <TouchEnhancedButton
                                                key={item.name}
                                                onClick={() => handleNavigation(item.href)}
                                                className={`w-full flex items-start space-x-3 px-4 py-3 rounded-lg text-left transition-all touch-friendly ${
                                                    item.current
                                                        ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-500'
                                                        : 'text-gray-700 hover:bg-purple-50 active:bg-purple-100'
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
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"/>
                                                )}
                                            </TouchEnhancedButton>
                                        ))}
                                    </div>
                                )}

                                {/* Add some bottom padding to ensure last items are accessible */}
                                <div className="h-4"></div>
                            </nav>
                        </div>

                        {/* User Profile & Sign Out Section - CLEANED UP */}
                        <div className="border-t bg-gray-50 flex-shrink-0">
                            {/* User Info */}
                            {session && (
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {session?.user?.avatar ? (
                                                <img
                                                    src={getApiUrl(`/api/user/avatar/${session.user.avatar}`)}
                                                    alt="Profile"
                                                    className="w-10 h-10 object-cover rounded-full"
                                                    onError={(e) => {
                                                        // Hide the image and show fallback
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-indigo-600 text-sm font-medium">
                                                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                            )}

                                            {/* Fallback span that shows when image fails to load */}
                                            {session?.user?.avatar && (
                                                <span
                                                    className="text-indigo-600 text-sm font-medium"
                                                    style={{display: 'none'}}
                                                    ref={(el) => {
                                                        if (el && session?.user?.avatar) {
                                                            // This will be shown if the image fails to load
                                                            const img = el.parentElement.querySelector('img');
                                                            if (img) {
                                                                img.onerror = () => {
                                                                    img.style.display = 'none';
                                                                    el.style.display = 'flex';
                                                                };
                                                            }
                                                        }
                                                    }}
                                                >
                                                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                                            </span>
                                            )}
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
                                    onClick={() => handleNavigation('/account')}
                                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all touch-friendly"
                                >
                                    <span className="text-xl">⚙️</span>
                                    <span className="font-medium">Account Settings</span>
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
                  style={{
                      paddingTop: Capacitor.isNativePlatform() ? '88px' : '80px',  // Header height + status bar
                      paddingBottom: showPWABanner ? '160px' : '112px'  // Bottom nav + system nav + PWA banner
                  }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed left-0 right-0 bg-white border-t shadow-lg z-30"
                 style={{
                     bottom: '0',
                     paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)'
                 }}
            >
                {/* Your navigation content with proper padding */}
                <div className="flex justify-around items-center" style={{
                    height: '60px', // Fixed height for the nav items
                }}>
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
                </div>
            </nav>
            {/* PWA Install Banner - back at bottom */}
            <PWAInstallBanner/>
        </div>
    );
}