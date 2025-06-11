// file: /src/app/page.js v2

'use client';

import {useSession} from 'next-auth/react';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function Home() {
    const {data: session, status} = useSession();
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
        <MobileOptimizedLayout>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                {/* Header */}
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-6">
                            <div className="flex items-center">
                                <div className="flex items-center space-x-3">
                                    <div className="text-2xl">🍳</div>
                                    <h1 className="text-2xl font-bold text-gray-900">Doc Bear's Comfort Kitchen</h1>
                                </div>
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
                <br/>
                <br/>
                {/* Hero section */}
                <main className="flex-1">
                    <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                                Smart Food Inventory Management
                            </h1>
                            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
                                Keep track of what you have, discover recipes you can make, reduce food waste, and make
                                meal planning effortless.
                            </p>
                            <div className="mt-8 flex justify-center space-x-4">
                                <Link
                                    href="/auth/signup"
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg"
                                >
                                    Start Managing Your Kitchen
                                </Link>
                                <Link
                                    href="/auth/signin"
                                    className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-lg"
                                >
                                    Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                    <br/>
                    {/* Features section */}
                    <div className="py-16 bg-white">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="text-center">
                                <h2 className="text-3xl font-extrabold text-gray-900">
                                    Everything you need to manage your kitchen smartly
                                </h2>
                                <p className="mt-4 text-lg text-gray-500">
                                    From the creator of Doc Bear's Comfort Food Survival Guide cookbook series
                                </p>
                            </div>

                            <div className="mt-16">
                                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="text-center">
                                        <div
                                            className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                            📦
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">Smart Inventory
                                            Tracking</h3>
                                        <p className="mt-2 text-base text-gray-500">
                                            Track all your food items with expiration dates, quantities, and storage
                                            locations. Never forget what you have again.
                                        </p>
                                    </div>

                                    <div className="text-center">
                                        <div
                                            className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                            📱
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">UPC Barcode Scanning</h3>
                                        <p className="mt-2 text-base text-gray-500">
                                            Quickly add items by scanning UPC codes with your phone camera. Automatic
                                            product information lookup.
                                        </p>
                                    </div>

                                    <div className="text-center">
                                        <div
                                            className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                            🍳
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">Recipe Matching</h3>
                                        <p className="mt-2 text-base text-gray-500">
                                            Discover what you can cook with ingredients you already have. Access
                                            hundreds of recipes from Doc Bear's cookbook series, add your own recipes,
                                            or import from your favorite online recipe location.
                                        </p>
                                    </div>

                                    <div className="text-center">
                                        <div
                                            className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                            📅
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">Meal Planning</h3>
                                        <p className="mt-2 text-base text-gray-500">
                                            Plan your weekly meals and automatically generate shopping lists based on
                                            what you need versus what you have.
                                        </p>
                                    </div>

                                    <div className="text-center">
                                        <div
                                            className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                            📝
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">Smart Shopping Lists</h3>
                                        <p className="mt-2 text-base text-gray-500">
                                            Generate intelligent shopping lists from recipes or meal plans. Email lists
                                            to family and friends easily.
                                        </p>
                                    </div>

                                    <div className="text-center">
                                        <div
                                            className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto text-2xl">
                                            🥗
                                        </div>
                                        <h3 className="mt-6 text-lg font-medium text-gray-900">Nutritional
                                            Information</h3>
                                        <p className="mt-2 text-base text-gray-500">
                                            Access nutritional data for your inventory items and recipes to make
                                            informed dietary choices.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="bg-gray-50 py-16">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="text-center">
                                <h2 className="text-3xl font-extrabold text-gray-900">
                                    From a Marine Veteran & Culinary Expert
                                </h2>
                                <div className="mt-8 max-w-3xl mx-auto">
                                    <div className="flex items-center justify-center mb-6">
                                        <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                            <img
                                                alt="Dr. Edward McKeown"
                                                className="w-full h-full object-cover"
                                                src="/icons/edmckeown.jpg"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                            <div
                                                className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center text-3xl"
                                                style={{ display: 'none' }}
                                            >
                                                👨‍🍳
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-lg text-gray-600 mb-4">
                                        Created by <strong>Dr. Edward McKeown</strong>, U.S. Marine Corps veteran and
                                        author of the
                                        "Doc Bear's Comfort Food Survival Guide" cookbook series.
                                    </p>
                                    <p className="text-base text-gray-500">
                                        With over 30 years in hospitality management, food safety expertise, and a Ph.D.
                                        in
                                        Hospitality & Tourism Management, Dr. McKeown combines culinary knowledge with
                                        modern
                                        technology to help families reduce food waste and discover new recipes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <br/>
                    {/* CTA section */}
                    <div className="bg-indigo-50">
                        <div
                            className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
                            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                                <span className="block">Ready to organize your kitchen?</span>
                                <span className="block text-indigo-600">Start managing your food inventory today.</span>
                            </h2>
                            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
                                <div className="inline-flex rounded-md shadow">
                                    <Link
                                        href="/auth/signup"
                                        className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        Get started for free
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
                <br/>
                {/* Footer with Legal Links */}
                <Footer/>
            </div>
        </MobileOptimizedLayout>
    );
}