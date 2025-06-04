// file: /src/components/layout/DashboardLayout.js

'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
    const { data: session } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
        { name: 'Inventory', href: '/inventory', icon: '📦' },
        { name: 'Recipes', href: '/recipes', icon: '🍳' },
        { name: 'What Can I Make?', href: '/recipes/suggestions', icon: '💡' },
        { name: 'Shopping List', href: '/shopping', icon: '🛒' },
        { name: 'Admin Import', href: '/recipes/admin', icon: '⚙️' },
    ];

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
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
                            Food Inventory
                        </h1>
                        {/* Mobile close button */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-white hover:text-gray-200 p-1"
                        >
                            <span className="text-xl">×</span>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-2">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                onClick={() => setSidebarOpen(false)} // Close sidebar on mobile after click
                            >
                                <span className="mr-3 text-lg">{item.icon}</span>
                                {item.name}
                            </Link>
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
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                            >
                                <span className="mr-2">🚪</span>
                                Sign Out
                            </button>
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
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="mobile-menu-button"
                        >
                            <span className="sr-only">Open sidebar</span>
                            {/* Hamburger icon - made larger and more visible */}
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Desktop user info */}
                        <div className="hidden lg:flex lg:items-center lg:space-x-4 ml-auto">
                            {session && (
                                <>
                                    <div className="text-sm text-gray-700">
                                        Welcome, <span className="font-medium">{session.user.name}</span>
                                    </div>
                                    <button
                                        onClick={handleSignOut}
                                        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                    >
                                        <span className="mr-1">🚪</span>
                                        Sign Out
                                    </button>
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