'use client';
// file: /src/components/layout/MobileDashboardLayout.js v13 - FIXED: Excessive re-rendering issues

import {useState, useEffect, useCallback, useMemo} from 'react';
import {handleMobileSignOut} from '@/lib/mobile-signout';
import {useSafeSession} from '@/hooks/useSafeSession';
import {useRouter, usePathname, useSearchParams} from 'next/navigation';
import {PWAInstallBanner} from '@/components/mobile/PWAInstallBanner';
import {MobileHaptics} from '@/components/mobile/MobileHaptics';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {getApiUrl} from "@/lib/api-config";
import VerificationBanner from '@/components/auth/VerificationBanner';

export default function MobileDashboardLayout({children}) {
    const {data: session} = useSafeSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showPWABanner, setShowPWABanner] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [screenWidth, setScreenWidth] = useState(0);
    const [platformInfo, setPlatformInfo] = useState({
        isNative: false,
        isPWA: false,
        isReady: false,
        statusBarHeight: 0
    });

    // Memoize admin check to prevent recalculation
    const isAdmin = useMemo(() =>
            session?.user?.isAdmin || session?.user?.email === 'e.g.mckeown@gmail.com'
        , [session?.user?.isAdmin, session?.user?.email]);

    // Memoize navigation items to prevent recreation
    const allNavigationItems = useMemo(() => [
        { name: 'Dashboard', href: '/dashboard', icon: '🏠', current: pathname === '/dashboard', priority: 1 },
        { name: 'Inventory', href: '/inventory', icon: '📦', current: pathname === '/inventory', priority: 2 },
        { name: 'Recipes', href: '/recipes', icon: '📖', current: pathname.startsWith('/recipes'), priority: 3 },
        { name: 'Meal Planning', href: '/meal-planning', icon: '📅', current: pathname.startsWith('/meal-planning')},
        { name: 'Shopping', href: '/shopping', icon: '🛒', current: pathname.startsWith('/shopping'), priority: 4 },
        { name: 'Nutrition', href: '/dashboard/nutrition', icon: '📊', current: pathname === '/dashboard/nutrition', priority: 5 },
        { name: 'Stores', href: '/stores', icon: '🏪', current: pathname === '/stores', priority: 6 },
    ], [pathname]);

    // Memoize additional menu items
    const additionalMenuItems = useMemo(() => [
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

        // Shopping List Section
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
    ], [pathname, searchParams]);

    // Memoize admin menu items
    const adminMenuItems = useMemo(() => [
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
    ], [pathname]);

    // Memoize bottom navigation calculation
    const getBottomNavItems = useCallback(() => {
        if (screenWidth === 0) return allNavigationItems.slice(0, 4);

        let maxItems;
        if (screenWidth >= 480) {
            maxItems = 6;
        } else if (screenWidth >= 430) {
            maxItems = 5;
        } else if (screenWidth >= 375) {
            maxItems = 4;
        } else {
            maxItems = 4;
        }

        const currentItem = allNavigationItems.find(item => item.current);
        let itemsToShow = allNavigationItems.slice(0, maxItems);

        if (currentItem && !itemsToShow.some(item => item.current)) {
            itemsToShow[maxItems - 1] = currentItem;
        }

        return itemsToShow;
    }, [screenWidth, allNavigationItems]);

    // Memoize the navigation items
    const navigation = useMemo(() => getBottomNavItems(), [getBottomNavItems]);

    // Memoize grouped menu items
    const groupedMenuItems = useMemo(() => {
        return additionalMenuItems.reduce((acc, item) => {
            const section = item.section || 'Other';
            if (!acc[section]) acc[section] = [];
            acc[section].push(item);
            return acc;
        }, {});
    }, [additionalMenuItems]);

    // Memoize style calculations
    const mainContentStyle = useMemo(() => {
        let topPadding, bottomPadding;

        if (platformInfo.isNative) {
            topPadding = '80px';
        } else {
            topPadding = '80px';
        }

        if (showPWABanner) {
            bottomPadding = '60px';
        } else {
            bottomPadding = '20px';
        }

        return {
            paddingTop: topPadding,
            paddingBottom: bottomPadding
        };
    }, [platformInfo.isNative, showPWABanner]);

    const headerStyle = useMemo(() => {
        if (platformInfo.isNative) {
            return {
                top: '0',
                paddingTop: '8px'
            };
        } else {
            return {
                top: '0',
                paddingTop: '0'
            };
        }
    }, [platformInfo.isNative]);

    const bottomNavStyle = useMemo(() => ({
        bottom: '0',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)',
        minHeight: 'calc(68px + env(safe-area-inset-bottom, 0px))'
    }), []);

    // Enhanced platform detection with StatusBar handling
    useEffect(() => {
        async function detectPlatform() {
            console.log('🧪 MobileDashboardLayout DETAILED detection starting...');

            try {
                let isNative = false;
                let isPWA = false;
                let statusBarHeight = 0;

                // ADD THIS DEBUG SECTION:
                console.log('🧪 Window.Capacitor exists:', typeof window.Capacitor !== 'undefined');
                console.log('🧪 Window.Capacitor object:', window.Capacitor);

                if (typeof window !== 'undefined' && window.Capacitor) {
                    try {
                        const { Capacitor } = await import('@capacitor/core');
                        console.log('🧪 Capacitor import successful');
                        console.log('🧪 Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
                        console.log('🧪 Capacitor.getPlatform():', Capacitor.getPlatform());

                        isNative = Capacitor.isNativePlatform();

                        if (isNative) {
                            try {
                                const { StatusBar } = await import('@capacitor/status-bar');
                                const info = await StatusBar.getInfo();
                                statusBarHeight = info.height || 0;
                                console.log('📱 StatusBar info:', info);
                            } catch (statusBarError) {
                                console.log('StatusBar plugin not available:', statusBarError);
                                if (Capacitor.getPlatform() === 'android') {
                                    statusBarHeight = 24;
                                } else if (Capacitor.getPlatform() === 'ios') {
                                    statusBarHeight = 44;
                                }
                            }
                        }
                    } catch (capacitorError) {
                        console.log('Capacitor import failed:', capacitorError);
                        isNative = false;
                    }
                }

                if (!isNative && typeof window !== 'undefined') {
                    isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone ||
                        document.referrer.includes('android-app://');
                }

                console.log('🔧 Platform detection:', { isNative, isPWA, statusBarHeight });

                setPlatformInfo({
                    isNative,
                    isPWA,
                    statusBarHeight,
                    isReady: true
                });

            } catch (error) {
                console.error('Error detecting platform:', error);
                setPlatformInfo({
                    isNative: false,
                    isPWA: false,
                    statusBarHeight: 0,
                    isReady: true
                });
            }
        }

        detectPlatform();
    }, []); // No dependencies - only run once

    // Track screen width for responsive bottom navigation
    useEffect(() => {
        const updateScreenWidth = () => {
            setScreenWidth(window.innerWidth);
        };

        updateScreenWidth();
        window.addEventListener('resize', updateScreenWidth);
        return () => window.removeEventListener('resize', updateScreenWidth);
    }, []);

    // Handle scroll state for header styling - throttled
    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    setIsScrolled(window.scrollY > 10);
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, {passive: true});
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // PWA banner logic - only check when platform info is ready
    useEffect(() => {
        if (!platformInfo.isReady) return;

        const checkPWABanner = () => {
            const isStandalone = platformInfo.isPWA ||
                window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone ||
                document.referrer.includes('android-app://');

            const wasDismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true';
            const shouldShow = !platformInfo.isNative && !isStandalone && !wasDismissed;
            setShowPWABanner(shouldShow);
        };

        checkPWABanner();
    }, [platformInfo.isReady, platformInfo.isNative, platformInfo.isPWA]);

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname, searchParams]);

    // Memoized event handlers
    const handleNavigation = useCallback((href) => {
        MobileHaptics.light();
        setMobileMenuOpen(false);
        router.push(href);
    }, [router]);

    const toggleMobileMenu = useCallback(() => {
        MobileHaptics?.medium();
        setMobileMenuOpen(prev => {
            const newState = !prev;

            // Force menu visibility on iPad if needed
            setTimeout(() => {
                if (newState) {
                    const overlay = document.querySelector('.fixed.inset-0.z-50');
                    const panel = document.querySelector('.fixed.top-0.left-0.bottom-0');

                    if (overlay) {
                        overlay.style.cssText = `
                        display: block !important;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        z-index: 9999 !important;
                        background-color: rgba(0, 0, 0, 0.5) !important;
                        backdrop-filter: blur(4px) !important;
                    `;
                    }

                    if (panel) {
                        panel.style.cssText = `
                        display: flex !important;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        z-index: 10000 !important;
                        background: white !important;
                        width: 320px !important;
                        transform: translateX(0) !important;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                    `;
                    }

                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            }, 50);

            return newState;
        });
    }, [mobileMenuOpen]);

    const handleSignOut = useCallback(async () => {
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
    }, [isSigningOut]);

    if (!platformInfo.isReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading...</div>
                </div>
            </div>
        );
    }

    console.log('🎯 MobileDashboardLayout rendering with children:', !!children);
    console.log('📱 Screen width:', screenWidth, 'Bottom nav items:', navigation.length);
    console.log('📱 Platform info:', platformInfo);

    return (
        <div className={`min-h-screen bg-gray-50 ${platformInfo.isNative ? 'capacitor-android' : ''}`}>
            {/* Mobile Header */}
            <header
                className={`fixed left-0 right-0 z-40 transition-all duration-200 ${
                    isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white'
                }`}
                style={headerStyle}
            >
                <div className="flex items-center justify-between px-4 py-3 h-16">
                    {/* Left side - Hamburger Menu */}
                    <div className="flex items-center flex-shrink-0">
                        <TouchEnhancedButton
                            onClick={toggleMobileMenu}
                            className="flex items-center justify-center w-14 h-14 rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Open menu"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '56px',
                                minHeight: '56px'
                            }}
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ display: 'block' }}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </TouchEnhancedButton>
                    </div>

                    {/* Right side - Action buttons */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/inventory/receipt-scan')}
                            className="flex items-center justify-center w-14 h-14 rounded-lg bg-purple-600 text-white shadow-sm hover:bg-purple-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Scan receipt"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '56px',
                                minHeight: '56px'
                            }}
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ display: 'block' }}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/shopping/add-items')}
                            className="flex items-center justify-center w-14 h-14 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Add to shopping list"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '56px',
                                minHeight: '56px'
                            }}
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ display: 'block' }}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h12.2M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z"
                                />
                            </svg>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/inventory?action=add&scroll=form')}
                            className="flex items-center justify-center w-14 h-14 rounded-lg bg-green-600 text-white shadow-sm hover:bg-green-700 active:scale-95 transition-all touch-friendly"
                            aria-label="Quick add item"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '56px',
                                minHeight: '56px'
                            }}
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ display: 'block' }}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => handleNavigation('/profile')}
                            className="flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-full hover:bg-indigo-200 active:scale-95 transition-all touch-friendly overflow-hidden relative"
                            aria-label="Go to profile"
                            title="Profile"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '56px',
                                minHeight: '56px'
                            }}
                        >
                            {session?.user?.avatar ? (
                                <img
                                    src={getApiUrl(`/api/user/avatar/${session.user.avatar}`)}
                                    alt="Profile"
                                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.classList.add('show-fallback');
                                    }}
                                />
                            ) : null}
                            <span
                                className={`text-indigo-600 text-lg font-medium w-full h-full flex items-center justify-center ${
                                    session?.user?.avatar ? 'hidden' : 'block'
                                }`}
                                style={{
                                    display: session?.user?.avatar ? 'none' : 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
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

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50"
                        onClick={() => setMobileMenuOpen(false)}
                        style={{
                            display: 'block',
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9999,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    {/* Menu Panel */}
                    <div
                        className="fixed top-0 left-0 bottom-0 w-80 max-w-sm bg-white shadow-xl flex flex-col"
                        style={{
                            display: 'flex',
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            zIndex: 10000,
                            width: '320px',
                            maxWidth: '20rem',
                            background: 'white',
                            transform: 'translateX(0)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                    >
                        {/* Menu Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-lg">🍳</span>
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                                {platformInfo.isPWA && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">PWA</span>
                                )}
                                {platformInfo.isNative && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Native</span>
                                )}
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
                                    {allNavigationItems.map((item) => (
                                        <TouchEnhancedButton
                                            key={item.name}
                                            onClick={() => handleNavigation(item.href)}
                                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all touch-friendly ${
                                                item.current
                                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
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

                                {/* Additional menu items */}
                                {Object.entries(groupedMenuItems).map(([sectionName, items]) => (
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
                                                    setMobileMenuOpen(false);
                                                    setTimeout(() => {
                                                        router.push(item.href);
                                                    }, 100);
                                                }}
                                                className={`w-full flex items-start space-x-3 px-4 py-3 rounded-xl text-left transition-all touch-friendly ${
                                                    item.current
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
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
                                ))}

                                {/* Admin Section */}
                                {isAdmin && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-3 px-4">
                                            🔒 Admin Panel
                                        </h3>
                                        {adminMenuItems.map((item) => (
                                            <TouchEnhancedButton
                                                key={item.name}
                                                onClick={() => handleNavigation(item.href)}
                                                className={`w-full flex items-start space-x-3 px-4 py-3 rounded-xl text-left transition-all touch-friendly ${
                                                    item.current
                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
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

                                <div className="h-4"></div>
                            </nav>
                        </div>

                        {/* User Profile & Sign Out Section */}
                        <div className="border-t bg-gray-50">
                            {session && (
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center overflow-hidden">
                                            {session?.user?.avatar ? (
                                                <img
                                                    src={getApiUrl(`/api/user/avatar/${session.user.avatar}`)}
                                                    alt="Profile"
                                                    className="w-10 h-10 object-cover rounded-xl"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-indigo-600 text-sm font-medium">
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
                                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all touch-friendly"
                                >
                                    <span className="text-xl">⚙️</span>
                                    <span className="font-medium">Account Settings</span>
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={handleSignOut}
                                    disabled={isSigningOut}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all touch-friendly ${
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

            {/* Main Content */}
            <main className="mobile-main-content mobile-safe-layout" style={mainContentStyle}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav
                className="fixed left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg z-30"
                style={bottomNavStyle}
            >
                <div className="flex justify-around items-center px-2" style={{
                    height: '68px',
                    minHeight: '68px'
                }}>
                    {navigation.map((item) => (
                        <TouchEnhancedButton
                            key={item.name}
                            onClick={() => handleNavigation(item.href)}
                            className={`relative flex flex-col items-center justify-center space-y-1 px-2 py-2 rounded-xl transition-all touch-friendly min-w-0 flex-1 ${
                                item.current
                                    ? 'text-indigo-600 bg-indigo-50'
                                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                            }`}
                            style={{
                                maxWidth: `${Math.floor(100 / navigation.length)}%`
                            }}
                        >
                            <span className="text-xl leading-none">{item.icon}</span>
                            <span className={`font-medium leading-tight text-center max-w-full truncate px-1 ${
                                navigation.length > 4 ? 'text-xs' : 'text-xs'
                            }`}>
                        {item.name}
                    </span>
                            {item.current && (
                                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"/>
                            )}
                        </TouchEnhancedButton>
                    ))}
                </div>
            </nav>

            {/* PWA Install Banner */}
            {!platformInfo.isNative && <PWAInstallBanner/>}
        </div>
    );
}