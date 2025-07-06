'use client';
// file: /src/components/layout/DashboardLayout.js - v5 - Fixed click-outside to close sidebar

import {handleMobileSignOut} from '@/lib/mobile-signout';
import {signOut} from 'next-auth/react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {useState, useEffect, useRef} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import Link from 'next/link';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {MobileHaptics} from "@/components/mobile/MobileHaptics";


export default function DashboardLayout({children}) {
    const {data: session} = useSafeSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const [isSigningOut, setIsSigningOut] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const sidebarRef = useRef(null);

    // Close sidebar when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                // Check if click is on the hamburger menu button (don't close if clicking the button)
                const menuButton = event.target.closest('.mobile-menu-button');
                if (!menuButton) {
                    setSidebarOpen(false);
                }
            }
        };

        if (sidebarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [sidebarOpen]);

    // Close sidebar when route changes
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const navigation = [
        {name: 'Dashboard', href: '/dashboard', icon: '🏠'},
        {
            name: 'Inventory',
            href: '/inventory',
            icon: '📦',
            submenu: [
                {name: 'View Inventory', href: '/inventory', icon: '📋'},
                {name: 'Usage History', href: '/inventory/history', icon: '📊'}
            ]
        },
        {
            name: 'Recipes',
            href: '/recipes',
            icon: '🍳',
            submenu: [
                {name: 'Browse Recipes', href: '/recipes', icon: '📖'},
                {name: 'Add New Recipe', href: '/recipes/add', icon: '➕'}
            ]
        },
        {name: 'Meal Planning', href: '/meal-planning', icon: '📅'},
        {name: 'Shopping List', href: '/shopping', icon: '🛒'},
        {name: 'What Can I Make?', href: '/recipes/suggestions', icon: '💡'},
        {name: 'Account Settings', href: '/account', icon: '👤'},
        // { name: 'Admin Import', href: '/recipes/admin', icon: '⚙️' },
    ];

    // FIXED: Enhanced sign-out that detects environment and uses appropriate method
    const handleSignOut = async () => {
        if (isSigningOut) return; // Prevent double-clicks

        try {
            setIsSigningOut(true);
            MobileHaptics?.medium(); // Only call if available

            console.log('Dashboard sign-out initiated');

            // Detect if we're in a mobile/PWA environment
            const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator?.standalone === true ||
                document.referrer.includes('android-app://');

            if (isPWA) {
                console.log('PWA environment detected, using mobile sign-out');
                await handleMobileSignOut({
                    callbackUrl: '/'
                });
            } else {
                console.log('Desktop browser environment, using standard sign-out');

                // For desktop browsers, use a simpler approach
                try {
                    // Clear storage first
                    localStorage.clear();
                    sessionStorage.clear();

                    // Then call NextAuth signOut
                    await signOut({
                        callbackUrl: '/',
                        redirect: true
                    });
                } catch (signOutError) {
                    console.log('Standard signOut failed:', signOutError);
                    // Fallback to manual redirect
                    window.location.href = '/';
                }
            }

        } catch (error) {
            console.error('Dashboard sign-out error:', error);
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

    const toggleSubmenu = (itemName) => {
        setExpandedMenus(prev => ({
            ...prev,
            [itemName]: !prev[itemName]
        }));
    };

    const isCurrentPage = (href) => {
        return pathname === href;
    };

    const isParentActive = (item) => {
        if (item.submenu) {
            return item.submenu.some(subItem => isCurrentPage(subItem.href)) || isCurrentPage(item.href);
        }
        return isCurrentPage(item.href);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* FIXED: Overlay that appears when sidebar is open (on all screen sizes) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                ref={sidebarRef}
                className={`fixed left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-hidden ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{
                    top: '0',
                    bottom: '700px',
                    maxHeight: 'calc(100vh - 700px)'
                }}
            >
                    <div className="flex flex-col h-full">
                        {/* Logo/Title */}
                        <div className="flex items-center justify-between h-16 px-4 bg-indigo-600 flex-shrink-0">
                            <h1 className="text-lg font-semibold text-white truncate">
                                Doc Bear's<br/>
                                Comfort Kitchen
                            </h1>

                            {/* Close button - FIXED: Now shows on all screen sizes when sidebar is open */}
                            {sidebarOpen && (
                                <TouchEnhancedButton
                                    onClick={() => setSidebarOpen(false)}
                                    className="text-white hover:text-gray-200 p-1"
                                    title="Close menu"
                                >
                                    <span className="text-xl">×</span>
                                </TouchEnhancedButton>
                            )}
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                            {navigation.map((item) => (
                                <div key={item.name}>
                                    {/* Main navigation item */}
                                    <div className="flex items-center">
                                        <Link
                                            href={item.href}
                                            className={`flex items-center flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                                isParentActive(item)
                                                    ? 'text-indigo-700 bg-indigo-100'
                                                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                            onClick={() => setSidebarOpen(false)}
                                        >
                                            <span className="mr-3 text-lg">{item.icon}</span>
                                            {item.name}
                                        </Link>

                                        {/* Submenu toggle button */}
                                        {item.submenu && (
                                            <TouchEnhancedButton
                                                onClick={() => toggleSubmenu(item.name)}
                                                className="ml-1 p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                <svg
                                                    className={`w-4 h-4 transform transition-transform ${
                                                        expandedMenus[item.name] ? 'rotate-90' : ''
                                                    }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M9 5l7 7-7 7"/>
                                                </svg>
                                            </TouchEnhancedButton>
                                        )}
                                    </div>

                                    {/* Submenu items */}
                                    {item.submenu && (expandedMenus[item.name] || isParentActive(item)) && (
                                        <div className="ml-6 mt-1 space-y-1">
                                            {item.submenu.map((subItem) => (
                                                <Link
                                                    key={subItem.name}
                                                    href={subItem.href}
                                                    className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                                                        isCurrentPage(subItem.href)
                                                            ? 'text-indigo-700 bg-indigo-50 font-medium'
                                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                    }`}
                                                    onClick={() => setSidebarOpen(false)}
                                                >
                                                    <span className="mr-2 text-base">{subItem.icon}</span>
                                                    {subItem.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </nav>

                        {/* User info and sign out - Fixed layout */}
                        {session && (
                            <div className="border-t border-gray-200 p-4 flex-shrink-0">
                                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {session.user.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {session.user.email}
                                    </div>
                                </div>
                                <TouchEnhancedButton
                                    onClick={handleSignOut}
                                    disabled={isSigningOut}
                                    className={`w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                                        isSigningOut
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    <span className="mr-2">{isSigningOut ? '⏳' : '🚪'}</span>
                                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                                </TouchEnhancedButton>
                            </div>
                        )}
                    </div>
            </div>

            {/* Main content */}
            <div>
                {/* Top bar */}
                <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
                    <div className="flex items-center justify-between h-16 px-4">
                        {/* Menu button - FIXED: Now visible on all screen sizes */}
                        <TouchEnhancedButton
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="mobile-menu-button text-gray-500 hover:text-gray-700 p-2 rounded-md"
                        >
                            <span className="sr-only">Toggle sidebar</span>
                            {/* Hamburger icon */}
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </TouchEnhancedButton>

                        {/* Breadcrumb for current page */}
                        <div className="hidden sm:flex items-center text-sm text-gray-500">
                            {pathname === '/inventory/history' && (
                                <div className="flex items-center space-x-2">
                                    <span>📦 Inventory</span>
                                    <span>›</span>
                                    <span className="text-gray-900 font-medium">📊 Usage History</span>
                                </div>
                            )}
                            {pathname === '/recipes/suggestions' && (
                                <div className="flex items-center space-x-2">
                                    <span>🍳 Recipes</span>
                                    <span>›</span>
                                    <span className="text-gray-900 font-medium">💡 What Can I Make?</span>
                                </div>
                            )}
                            {pathname === '/recipes/add' && (
                                <div className="flex items-center space-x-2">
                                    <span>🍳 Recipes</span>
                                    <span>›</span>
                                    <span className="text-gray-900 font-medium">➕ Add New Recipe</span>
                                </div>
                            )}
                        </div>

                        {/* Desktop user info */}
                        <div className="hidden lg:flex lg:items-center lg:space-x-4 ml-auto">
                            {session && (
                                <>
                                    <div className="text-sm text-gray-700">
                                        Welcome, <span className="font-medium">{session.user.name}</span>
                                    </div>
                                    <TouchEnhancedButton
                                        onClick={handleSignOut}
                                        disabled={isSigningOut}
                                        className={`flex items-center px-3 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                                            isSigningOut
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                    >
                                        <span className="mr-1">{isSigningOut ? '⏳' : '🚪'}</span>
                                        {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                                    </TouchEnhancedButton>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}