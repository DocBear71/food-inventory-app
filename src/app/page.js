'use client';
// file: /src/app/page.js v6 - FIXED: Added more top spacing to prevent header bar overlap

import { useSafeSession } from '@/hooks/useSafeSession';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { MobileSession } from '@/lib/mobile-session-simple';

export default function Home() {
    const {data: session, status} = useSafeSession();
    const router = useRouter();
    const [isNative, setIsNative] = useState(false);
    const [nativeSessionChecked, setNativeSessionChecked] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');
    const [imageError, setImageError] = useState(false);

    // Check if we're on native platform and handle session detection
    useEffect(() => {
        async function checkPlatform() {
            try {
                const { Capacitor } = await import('@capacitor/core');
                const native = Capacitor.isNativePlatform();
                setIsNative(native);

                if (native) {
                    console.log('📱 Native platform detected in home page');
                    setDebugInfo('Native platform detected');

                    // For native, give extra time for session to load and check directly
                    const timeoutId = setTimeout(async () => {
                        if (nativeSessionChecked) return; // Prevent multiple checks

                        console.log('🔍 Checking mobile session directly...');
                        const mobileSession = await MobileSession.getSession();

                        if (mobileSession?.user) {
                            console.log('✅ Found mobile session, redirecting to dashboard');
                            setDebugInfo('Found mobile session, redirecting...');
                            router.replace('/dashboard');
                        } else {
                            console.log('❌ No mobile session found');
                            setDebugInfo('No mobile session found');
                            setNativeSessionChecked(true);
                        }
                    }, 2000); // Give 2 seconds for session to stabilize

                    // Cleanup timeout on unmount
                    return () => clearTimeout(timeoutId);
                } else {
                    setNativeSessionChecked(true);
                }
            } catch (error) {
                console.error('Error checking platform:', error);
                setNativeSessionChecked(true);
            }
        }

        checkPlatform();
    }, [router, nativeSessionChecked]); // Add nativeSessionChecked to dependencies

    // Handle session-based redirect for web platforms
    useEffect(() => {
        if (!isNative && status === 'authenticated' && session) {
            console.log('🌐 Web platform: Redirecting authenticated user to dashboard');
            router.push('/dashboard');
        }
    }, [status, session, router, isNative]);

    // Show loading state while checking native session
    if (isNative && !nativeSessionChecked) {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Checking your session...</div>
                        {debugInfo && (
                            <div className="text-sm text-gray-500 mt-2">{debugInfo}</div>
                        )}
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Show loading state for web platforms
    if (!isNative && status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // FIXED: Landing page with proper spacing and no overlay issues
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* FIXED: Added more top padding to prevent status bar/header overlay */}
            <header className="bg-white shadow-sm relative z-10 pt-safe">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6 pt-8">
                        {/* FIXED: Cleaner logo/title section */}
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xl">🍳</span>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold text-gray-900">Doc Bear's Comfort Kitchen</h1>
                                <p className="text-sm text-gray-500">Smart Food Inventory Management</p>
                            </div>
                            <div className="sm:hidden">
                                <h1 className="text-lg font-bold text-gray-900">Doc Bear's</h1>
                            </div>
                        </div>

                        {/* FIXED: Better mobile-responsive auth buttons */}
                        <div className="flex items-center space-x-2">
                            <Link
                                href="/auth/signin"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/auth/signup"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                            >
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* FIXED: Main content with proper spacing to prevent overlay */}
            <main className="flex-1">
                {/* Hero section with proper top padding */}
                <div className="relative bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
                        <div className="text-center">
                            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
                                Smart Food Inventory
                                <span className="block text-indigo-600">Management</span>
                            </h1>
                            <p className="max-w-2xl mt-6 mx-auto text-lg text-gray-600 leading-relaxed">
                                Keep track of what you have, discover recipes you can make, reduce food waste, and make meal planning effortless.
                            </p>

                            {/* FIXED: Better CTA section */}
                            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                                <Link
                                    href="/auth/signup"
                                    className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all duration-200 transform hover:scale-105"
                                >
                                    Start Managing Your Kitchen
                                </Link>
                                <Link
                                    href="/auth/signin"
                                    className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                >
                                    Sign In
                                </Link>
                            </div>

                            {/* FIXED: Add offline capability notice */}
                            <div className="mt-8 inline-flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                </svg>
                                <span>Cross-platform sync keeps your data available everywhere</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features section with better spacing */}
                <div className="py-16 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-extrabold text-gray-900">
                                Everything you need to manage your kitchen smartly
                            </h2>
                            <p className="mt-4 text-lg text-gray-600">
                                From the creator of Doc Bear's Comfort Food Survival Guide cookbook series
                            </p>
                        </div>

                        {/* FIXED: Better responsive grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📦</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Inventory Tracking</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Track all your food items with expiration dates, quantities, and storage locations. Never forget what you have again.
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📱</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">UPC Barcode Scanning</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Quickly add items by scanning UPC codes with your phone camera. Automatic product information lookup.
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🍳</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recipe Matching</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Discover what you can cook with ingredients you already have. Access hundreds of recipes from Doc Bear's cookbook series.
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📅</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Meal Planning</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Plan your weekly meals and automatically generate shopping lists based on what you need versus what you have.
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📝</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Shopping Lists</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Generate intelligent shopping lists from recipes or meal plans. Email lists to family and friends easily.
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🥗</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nutritional Information</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Access nutritional data for your inventory items and recipes to make informed dietary choices.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div className="bg-white py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
                            From a Marine Veteran & Culinary/Food Safety Expert
                        </h2>

                        <div className="flex items-center justify-center mb-6">
                            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-indigo-100 shadow-lg bg-gray-200 relative">
                                {!imageError ? (
                                    <img
                                        alt="Dr. Edward McKeown"
                                        className="w-full h-full object-cover"
                                        src="/icons/edmckeown.jpg"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-2xl">
                                        👨‍🍳
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-lg text-gray-700">
                                Created by <strong>Dr. Edward McKeown</strong>, U.S. Marine Corps veteran and author of the "Doc Bear's Comfort Food Survival Guide" cookbook series.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                With over 30 years in hospitality management, food safety expertise, and a Ph.D. in Hospitality & Tourism Management, Dr. McKeown combines culinary knowledge with modern technology to help families reduce food waste and discover new recipes.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Final CTA section */}
                <div className="bg-indigo-50 py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
                            Ready to organize your kitchen?
                        </h2>
                        <p className="text-lg text-gray-600 mb-8">
                            Start managing your food inventory today and never waste food again.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                            <Link
                                href="/auth/signup"
                                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all duration-200"
                            >
                                Get started for free
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg text-indigo-600 bg-white hover:bg-gray-50 border border-indigo-200 shadow-sm transition-colors"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer/>
        </div>
    );
}