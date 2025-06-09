// file: /src/components/layout/DashboardLayout.js - v2

'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function DashboardLayout({ children }) {
    const { data: session } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const pathname = usePathname();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
        {
            name: 'Inventory',
            href: '/inventory',
            icon: '📦',
            submenu: [
                { name: 'View Inventory', href: '/inventory', icon: '📋' },
                { name: 'Usage History', href: '/inventory/history', icon: '📊' }
            ]
        },
        { name: 'Recipes', href: '/recipes', icon: '🍳' },
        { name: 'What Can I Make?', href: '/recipes/suggestions', icon: '💡' },
        { name: 'Meal Planning', href: '/meal-planning', icon: '📅' },
        { name: 'Shopping List', href: '/shopping', icon: '🛒' },
        { name: 'Profile Settings', href: '/profile', icon: '👤' },
        { name: 'Admin Import', href: '/recipes/admin', icon: '⚙️' },
    ];

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
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
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="flex flex-col h-full">
                    {/* Logo/Title */}
                    <div className="flex items-center justify-between h-16 px-4 bg-indigo-600">
                        <h1 className="text-lg font-semibold text-white truncate">
                            Doc Bear's Comfort Kitchen
                        </h1>
                        {/* Mobile close button */}
                        <TouchEnhancedButton
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-white hover:text-gray-200 p-1"
                        >
                            <span className="text-xl">×</span>
                        </TouchEnhancedButton>
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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
                        <div className="border-t border-gray-200 p-4">
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
                                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                            >
                                <span className="mr-2">🚪</span>
                                Sign Out
                            </TouchEnhancedButton>
                        </div>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
                    <div className="flex items-center justify-between h-16 px-4">
                        {/* Mobile menu button - Always visible on mobile */}
                        <TouchEnhancedButton
                            onClick={() => setSidebarOpen(true)}
                            className="mobile-menu-button"
                        >
                            <span className="sr-only">Open sidebar</span>
                            {/* Hamburger icon - made larger and more visible */}
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
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
                                        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                    >
                                        <span className="mr-1">🚪</span>
                                        Sign Out
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