// file: /src/components/landing/LandingContent.js - UPDATED: Force native content

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/legal/Footer';
import { TouchEnhancedButton } from "@/components/mobile/TouchEnhancedButton.js";

export default function LandingContent() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isNativeApp, setIsNativeApp] = useState(null);
    const [forceNativeMode, setForceNativeMode] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();

    // Enhanced platform detection that forces native mode
    useEffect(() => {
        const handlePlatformDetected = (event) => {
            console.log('🎯 Landing page received platform info:', event.detail);
            setIsNativeApp(event.detail.isNative);

            // FORCE native mode for Android
            if (event.detail.isNative) {
                setForceNativeMode(true);
                console.log('🔧 FORCING NATIVE MODE in landing page');
            }
        };

        // Check multiple sources for platform info
        const checkPlatform = () => {
            // Check global flag
            if (window.__FORCE_NATIVE_MODE__) {
                setIsNativeApp(true);
                setForceNativeMode(true);
                return;
            }

            // Check platform info
            if (window.platformInfo?.isNative) {
                setIsNativeApp(true);
                setForceNativeMode(true);
                return;
            }

            // Fallback detection
            const userAgent = navigator.userAgent || '';
            const isAndroid = userAgent.includes('Android') && userAgent.includes('Mobile');
            const hasCapacitor = typeof window.Capacitor !== 'undefined';
            const isYourSite = window.location.hostname === 'docbearscomfort.kitchen';

            if (isAndroid && hasCapacitor && isYourSite) {
                console.log('🔧 Landing page fallback: Detected as native Android app');
                setIsNativeApp(true);
                setForceNativeMode(true);
            } else {
                setIsNativeApp(false);
            }
        };

        // Listen for events
        window.addEventListener('platformDetected', handlePlatformDetected);
        window.addEventListener('nativeModeForced', handlePlatformDetected);
        window.addEventListener('forceNativeUpdate', handlePlatformDetected);

        // Check immediately
        checkPlatform();

        // Re-check periodically for the first few seconds
        const recheckInterval = setInterval(checkPlatform, 500);
        setTimeout(() => clearInterval(recheckInterval), 5000);

        return () => {
            window.removeEventListener('platformDetected', handlePlatformDetected);
            window.removeEventListener('nativeModeForced', handlePlatformDetected);
            window.removeEventListener('forceNativeUpdate', handlePlatformDetected);
            clearInterval(recheckInterval);
        };
    }, []);

    // Platform-aware authentication redirect
    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            console.log('🔄 Authenticated user detected, redirecting to dashboard');
            router.replace('/dashboard');
        }
    }, [status, session, router]);

    // Handle navbar scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Authentication handlers that respect native mode
    const handleAuthNavigation = (action) => {
        console.log('🔗 Auth navigation:', { action, isNativeApp, forceNativeMode });

        if (isNativeApp || forceNativeMode) {
            console.log('🔧 Native app auth navigation');
            // Stay in app for native
            router.push(action === 'signin' ? '/auth/signin' : '/auth/signup');
        } else {
            console.log('🌐 Web browser auth navigation');
            router.push(action === 'signin' ? '/auth/signin' : '/auth/signup');
        }
    };

    // Show loading while detecting platform
    if (isNativeApp === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading...</div>
                </div>
            </div>
        );
    }

    // Don't render if authenticated (will redirect)
    if (status === 'authenticated') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Redirecting to dashboard...</div>
                </div>
            </div>
        );
    }

    console.log('🎯 Landing page rendering for:', isNativeApp ? 'NATIVE APP' : 'WEB BROWSER', { forceNativeMode });

    // NATIVE APP VERSION - Simplified content focused on account creation
    if (isNativeApp || forceNativeMode) {
        return (
            <div className="bg-gray-50 min-h-screen">
                {/* Debug banner */}
                <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-xs p-2 text-center font-mono">
                    ✅ NATIVE APP LANDING PAGE - Account Creation Focus
                </div>

                <div style={{ paddingTop: '40px' }} className="min-h-screen flex flex-col justify-center">
                    <div className="max-w-md mx-auto px-4 py-8 text-center">
                        {/* App branding */}
                        <div className="mb-8">
                            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <img src="/icons/icon-32x32.png" alt="Doc Bear's Kitchen" className="w-12 h-12" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Doc Bear's Comfort Kitchen</h1>
                            <p className="text-gray-600">Native Android App</p>
                        </div>

                        {/* Welcome message */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Welcome to Your Kitchen Assistant!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                You're using the native Android app. Create an account to sync your data and unlock all features.
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="space-y-4 mb-8">
                            <TouchEnhancedButton
                                onClick={() => handleAuthNavigation('signup')}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-xl text-lg font-semibold shadow-lg transition-all hover:shadow-xl"
                            >
                                Create Account
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => handleAuthNavigation('signin')}
                                className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-4 px-6 rounded-xl text-lg font-semibold transition-colors"
                            >
                                Sign In
                            </TouchEnhancedButton>
                        </div>

                        {/* Features list */}
                        <div className="text-sm text-gray-500 space-y-2">
                            <div className="flex items-center justify-center space-x-2">
                                <span className="text-green-500">✓</span>
                                <span>Multi-part recipes</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                                <span className="text-green-500">✓</span>
                                <span>AI-powered tools</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                                <span className="text-green-500">✓</span>
                                <span>Sync across devices</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // WEB VERSION - Full landing page (your existing design would go here)
    return (
        <div className="bg-gray-50">
            {/* Debug banner */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-xs p-2 text-center font-mono">
                🌐 WEB BROWSER LANDING PAGE - Full Experience
            </div>

            {/* Your existing web landing page content */}
            <div style={{ paddingTop: '40px' }}>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-4">Doc Bear's Comfort Kitchen</h1>
                        <p className="text-gray-600 mb-8">Web Version - Full Landing Page</p>

                        <div className="space-x-4">
                            <TouchEnhancedButton
                                onClick={() => handleAuthNavigation('signup')}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold"
                            >
                                Get Started
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => handleAuthNavigation('signin')}
                                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-lg font-semibold"
                            >
                                Sign In
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}