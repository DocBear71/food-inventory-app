'use client';
// file: /src/app/page.js v4 - Enhanced Android session detection

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function Home() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const [isAndroid, setIsAndroid] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);

    useEffect(() => {
        // Enhanced Android detection and session checking
        const checkPlatformAndSession = async () => {
            let androidDetected = false;

            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    const { Device } = await import('@capacitor/device');
                    const info = await Device.getInfo();
                    androidDetected = info.platform === 'android';
                    setIsAndroid(androidDetected);
                }
            } catch (e) {
                console.log('Platform detection failed, assuming web');
            }

            console.log('🏠 Home page session check:', {
                status,
                hasSession: !!session,
                isAndroid: androidDetected,
                sessionUser: session?.user?.email
            });

            // Enhanced session checking for Android
            if (androidDetected && status !== 'loading') {
                try {
                    // Check mobile session storage
                    const { MobileSession } = await import('@/lib/mobile-session-simple');
                    const mobileSession = await MobileSession.getSession();

                    console.log('Android mobile session check:', {
                        hasMobileSession: !!mobileSession,
                        mobileUser: mobileSession?.user?.email
                    });

                    // Also check localStorage backup
                    const backupSession = localStorage.getItem('android-auth-session');
                    if (backupSession) {
                        const parsedBackup = JSON.parse(backupSession);
                        console.log('Android backup session found:', parsedBackup.user?.email);

                        // If we have a backup session but no NextAuth session, redirect anyway
                        if (!session && parsedBackup.user) {
                            console.log('Using Android backup session for redirect');
                            router.push('/dashboard');
                            return;
                        }
                    }

                    // If mobile session exists but NextAuth doesn't, redirect
                    if (mobileSession?.user && !session) {
                        console.log('Mobile session exists without NextAuth, redirecting');
                        router.push('/dashboard');
                        return;
                    }

                } catch (error) {
                    console.error('Android session check error:', error);
                }
            }

            // Standard redirect for authenticated users
            if (status === 'authenticated' && session?.user) {
                console.log('Standard authenticated redirect');
                router.push('/dashboard');
            }

            setSessionChecked(true);
        };

        checkPlatformAndSession();
    }, [status, session, router]);

    // Enhanced loading state for Android
    if (status === 'loading' || !sessionChecked) {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">
                            {isAndroid ? 'Checking Android session...' : 'Loading...'}
                        </div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Show landing page when not authenticated
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

                {/* Enhanced debug info for Android */}
                {isAndroid && process.env.NODE_ENV === 'development' && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 mx-4 rounded">
                        <h3 className="font-bold">Android Debug Info:</h3>
                        <p>Status: {status}</p>
                        <p>Session: {session ? 'Yes' : 'No'}</p>
                        <p>User: {session?.user?.email || 'None'}</p>
                    </div>
                )}

                {/* Rest of the landing page content remains the same */}
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

                    {/* Rest of your existing landing page content... */}
                    {/* Features section, About section, CTA section */}

                </main>

                <Footer/>
            </div>
        </MobileOptimizedLayout>
    );
}