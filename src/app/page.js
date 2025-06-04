// file: /src/app/page.js

'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/dashboard');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (session) {
        return null; // Will redirect to dashboard
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">Food Inventory Manager</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/auth/signin"
                                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/auth/signup"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero section */}
            <main>
                <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                            Manage Your Food Inventory
                        </h1>
                        <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
                            Keep track of what you have, discover recipes you can make, and never waste food again.
                        </p>
                        <div className="mt-8">
                            <Link
                                href="/auth/signup"
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Features section */}
                <div className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h2 className="text-3xl font-extrabold text-gray-900">
                                Everything you need to manage your kitchen
                            </h2>
                        </div>

                        <div className="mt-16">
                            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="text-center">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                        📦
                                    </div>
                                    <h3 className="mt-6 text-lg font-medium text-gray-900">Inventory Tracking</h3>
                                    <p className="mt-2 text-base text-gray-500">
                                        Keep track of all your food items with expiration dates and locations.
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                        📱
                                    </div>
                                    <h3 className="mt-6 text-lg font-medium text-gray-900">Barcode Scanning</h3>
                                    <p className="mt-2 text-base text-gray-500">
                                        Quickly add items by scanning UPC codes with your phone camera.
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                        🍳
                                    </div>
                                    <h3 className="mt-6 text-lg font-medium text-gray-900">Recipe Suggestions</h3>
                                    <p className="mt-2 text-base text-gray-500">
                                        Discover what you can cook with the ingredients you already have.
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                        ⚠️
                                    </div>
                                    <h3 className="mt-6 text-lg font-medium text-gray-900">Expiration Alerts</h3>
                                    <p className="mt-2 text-base text-gray-500">
                                        Get notified when items are about to expire to reduce waste.
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                        📝
                                    </div>
                                    <h3 className="mt-6 text-lg font-medium text-gray-900">Recipe Management</h3>
                                    <p className="mt-2 text-base text-gray-500">
                                        Store and organize your favorite recipes in one place.
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                        📊
                                    </div>
                                    <h3 className="mt-6 text-lg font-medium text-gray-900">Smart Analytics</h3>
                                    <p className="mt-2 text-base text-gray-500">
                                        Get insights into your food consumption and shopping patterns.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA section */}
                <div className="bg-indigo-50">
                    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
                        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            <span className="block">Ready to organize your kitchen?</span>
                            <span className="block text-indigo-600">Start managing your inventory today.</span>
                        </h2>
                        <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
                            <div className="inline-flex rounded-md shadow">
                                <Link
                                    href="/auth/signup"
                                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Get started
                                </Link>
                            </div>
                            <div className="ml-3 inline-flex rounded-md shadow">
                                <Link
                                    href="/auth/signin"
                                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <div className="text-center text-gray-500">
                        <p>&copy; 2025 Food Inventory Manager. Built for home cooks who care about organization.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}