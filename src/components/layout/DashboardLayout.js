// file: src/components/layout/DashboardLayout.js

'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
    const { data: session } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
        { name: 'Inventory', href: '/inventory', icon: '📦' },
        { name: 'Recipes', href: '/recipes', icon: '🍳' },
        { name: 'What Can I Make?', href: '/recipes/suggestions', icon: '💡' },
    ];

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex-shrink-0`}>
                <div className="flex items-center justify-center h-16 px-4 bg-indigo-600">
                    <h1 className="text-xl font-bold text-white">Food Inventory</h1>
                </div>

                <nav className="mt-8">
                    <div className="px-4 space-y-2">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    pathname === item.href
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <span className="mr-3 text-lg">{item.icon}</span>
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </nav>

                {/* User info and sign out */}
                <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
                    <div className="flex items-center">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {session?.user?.name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                                {session?.user?.email}
                            </p>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="ml-3 flex-shrink-0 p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            title="Sign out"
                        >
                            🚪
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                >
                    <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="bg-white shadow-sm lg:static lg:overflow-y-visible">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="relative flex justify-between xl:grid xl:grid-cols-12 lg:gap-8">
                            <div className="flex md:absolute md:left-0 md:inset-y-0 lg:static xl:col-span-2">
                                <div className="flex-shrink-0 flex items-center">
                                    <button
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        className="p-2 rounded-md text-gray-400 lg:hidden focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                    >
                                        ☰
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}