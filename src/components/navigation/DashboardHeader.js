'use client';

// file: /src/components/navigation/DashboardHeader.js


import { useSafeSession } from '@/hooks/useSafeSession';
import Link from 'next/link';
import ProfileDropdown from './ProfileDropdown';

export default function DashboardHeader() {
    const { data: session } = useSafeSession();

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo/Brand */}
                    <div className="flex items-center">
                        <Link
                            href="/dashboard"
                            className="text-xl font-bold text-indigo-600 hover:text-indigo-700"
                        >
                            🐻 Doc Bear's Comfort Kitchen
                        </Link>
                    </div>

                    {/* Navigation Items */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/dashboard"
                            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/inventory"
                            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Inventory
                        </Link>
                        <Link
                            href="/recipes"
                            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Recipes
                        </Link>
                        <Link
                            href="/meal-planning"
                            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Meal Plans
                        </Link>
                    </div>

                    {/* User Profile Dropdown */}
                    <div className="flex items-center">
                        {session ? (
                            <ProfileDropdown />
                        ) : (
                            <div className="space-x-2">
                                <Link
                                    href="/auth/signin"
                                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            <div className="md:hidden border-t border-gray-200">
                <div className="px-2 pt-2 pb-3 space-y-1">
                    <Link
                        href="/dashboard"
                        className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/inventory"
                        className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                    >
                        Inventory
                    </Link>
                    <Link
                        href="/recipes"
                        className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                    >
                        Recipes
                    </Link>
                    <Link
                        href="/meal-planning"
                        className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                    >
                        Meal Plans
                    </Link>
                </div>
            </div>
        </header>
    );
}