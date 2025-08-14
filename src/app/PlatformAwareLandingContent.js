'use client';

// file: /src/app/PlatformAwareLandingContent.js v1.0 - Platform detection and native app handling

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/legal/Footer';
import { TouchEnhancedButton } from "@/components/mobile/TouchEnhancedButton.js";
import { Capacitor } from '@capacitor/core';

// Platform detection hook
function usePlatformDetection() {
    const [platform, setPlatform] = useState('web');
    const [isNativeApp, setIsNativeApp] = useState(false);

    useEffect(() => {
        // Detect if running in Capacitor (native app)
        const isCapacitor = Capacitor.isNativePlatform();
        const capacitorPlatform = Capacitor.getPlatform();

        setIsNativeApp(isCapacitor);
        setPlatform(isCapacitor ? capacitorPlatform : 'web');

        console.log('🔍 Platform detection:', {
            isNativeApp: isCapacitor,
            platform: isCapacitor ? capacitorPlatform : 'web',
            userAgent: navigator.userAgent
        });
    }, []);

    return { platform, isNativeApp };
}

// Image Carousel Component (same as before)
function ImageCarousel({ images, alt, interval = 2000 }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, interval);

        return () => clearInterval(timer);
    }, [images.length, interval]);

    return (
        <div className="image-carousel">
            {images.map((image, index) => (
                <Image
                    key={index}
                    src={image}
                    alt={`${alt} ${index + 1}`}
                    width={200}
                    height={120}
                    className={`rounded-lg ${index === currentIndex ? 'active' : 'inactive'}`}
                />
            ))}
        </div>
    );
}

export default function PlatformAwareLandingContent() {
    const [isScrolled, setIsScrolled] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();
    const { platform, isNativeApp } = usePlatformDetection();

    // MODIFIED: Platform-aware authentication redirect
    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            console.log('🔄 Authenticated user detected, platform:', platform);

            if (isNativeApp) {
                // For native apps, navigate within the app
                console.log('📱 Native app - redirecting to dashboard');
                router.replace('/dashboard');
            } else {
                // For web, use normal redirect
                console.log('🌐 Web app - redirecting to dashboard');
                router.replace('/dashboard');
            }
        }
    }, [status, session, router, platform, isNativeApp]);

    // Handle navbar scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Smooth scroll helper
    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // ADDED: Platform-aware navigation handlers
    const handleAuthNavigation = (action) => {
        console.log('🔗 Auth navigation:', { action, platform, isNativeApp });

        if (isNativeApp) {
            // For native apps, navigate within the app
            router.push(action === 'signin' ? '/auth/signin' : '/auth/signup');
        } else {
            // For web, use normal navigation
            router.push(action === 'signin' ? '/auth/signin' : '/auth/signup');
        }
    };

    // Show loading spinner while checking authentication
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading...</div>
                </div>
            </div>
        );
    }

    // Don't render the landing page if user is authenticated (they'll be redirected)
    if (status === 'authenticated') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">
                        {isNativeApp ? 'Opening dashboard in app...' : 'Redirecting to dashboard...'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50">
            {/* Styles - same as before */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

                * {
                    font-family: 'Inter', sans-serif;
                }

                .gradient-bg {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .gradient-text {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .glass-effect {
                    backdrop-filter: blur(10px);
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .floating {
                    animation: floating 3s ease-in-out infinite;
                }

                @keyframes floating {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }

                .fade-in {
                    animation: fadeIn 0.8s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .hero-pattern {
                    background-image:
                        radial-gradient(circle at 25% 25%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 75% 75%, rgba(118, 75, 162, 0.1) 0%, transparent 50%);
                }

                .feature-card {
                    transition: all 0.3s ease;
                }

                .feature-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                }

                .screenshot-container {
                    perspective: 1000px;
                }

                .screenshot-phone {
                    transform: rotateY(-5deg) rotateX(2deg);
                    transition: all 0.3s ease;
                }

                .screenshot-phone:hover {
                    transform: rotateY(0deg) rotateX(0deg) scale(1.02);
                }

                .hero-spacing {
                    padding-top: 4rem;
                    padding-bottom: 4rem;
                }

                .floating-items {
                    position: absolute;
                    background: white;
                    border-radius: 1rem;
                    padding: 0.75rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    z-index: 20;
                }

                .floating-top-left {
                    top: -1rem;
                    left: -2rem;
                }

                .floating-bottom-right {
                    bottom: -1rem;
                    right: -2rem;
                    animation-delay: 1.5s;
                }

                .image-carousel {
                    position: relative;
                    overflow: hidden;
                    border-radius: 0.5rem;
                    width: 100%;
                    height: 650px;
                }

                .image-carousel img {
                    transition: opacity 0.5s ease-in-out;
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .image-carousel img.active {
                    opacity: 1;
                }

                .image-carousel img.inactive {
                    opacity: 0;
                }

                .feature-image-container {
                    height: 650px;
                    width: 100%;
                    position: relative;
                    overflow: hidden;
                    border-radius: 0.5rem;
                }

                .badge-positioning {
                    position: absolute;
                    bottom: -1rem;
                    left: 50%;
                    transform: translateX(-50%);
                }

                @media (min-width: 1024px) {
                    .badge-positioning {
                        left: auto;
                        right: 2rem;
                        transform: none;
                    }
                }

                @media (max-width: 768px) {
                    .screenshot-phone {
                        transform: none;
                    }

                    .screenshot-phone:hover {
                        transform: scale(1.02);
                    }

                    .hero-section {
                        padding-left: 0 !important;
                    }

                    .hero-spacing {
                        padding-top: 4rem;
                        padding-bottom: 3rem;
                    }
                }
            `}</style>

            {/* Navigation - MODIFIED for platform awareness */}
            <nav className={`fixed top-0 w-full z-50 border-b border-gray-200 transition-all duration-300 ${
                isScrolled ? 'bg-white/95 backdrop-blur-md' : 'bg-white/90 backdrop-blur-md'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-3 md:py-4">
                        <div className="flex items-center space-x-2 md:space-x-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                                <span className="text-white text-lg md:text-xl"><img src="/icons/icon-32x32.png" alt="Comfort Kitchen Logo" /></span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1 md:space-x-4">
                            {!isNativeApp && (
                                <Link
                                    href="/recipe-search"
                                    className="text-gray-600 hover:text-gray-900 px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
                                >
                                    Recipes
                                </Link>
                            )}
                            {!isNativeApp && (
                                <Link
                                    href="/pricing"
                                    className="text-gray-600 hover:text-gray-900 px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
                                >
                                    Pricing
                                </Link>
                            )}
                            <TouchEnhancedButton
                                onClick={() => handleAuthNavigation('signin')}
                                className="text-gray-600 hover:text-gray-900 px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
                            >
                                Sign In
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => handleAuthNavigation('signup')}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium shadow-sm transition-all hover:shadow-md"
                            >
                                Get Started
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section - MODIFIED CTAs for platform awareness */}
            <section className="relative overflow-hidden hero-pattern hero-spacing">
                <div className="max-w-7xl mx-auto px-4 sm:px-3 lg:px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Column: Content */}
                        <div className="fade-in">
                            {/* Brand title */}
                            <div className="mb-4">
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Doc Bear's Comfort Kitchen</h1>
                                <p className="text-sm text-gray-600">AI-Powered Food Management</p>
                                {isNativeApp && (
                                    <div className="mt-2 text-xs text-purple-600 font-medium">
                                        📱 Running in {platform === 'ios' ? 'iOS' : 'Android'} App
                                    </div>
                                )}
                            </div>

                            <div className="inline-flex items-center bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                                <span className="mr-2">🆕</span>
                                Version 1.7.0 - enhanced recipe discovery with advanced sorting options
                            </div>

                            <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                                Smart Food Inventory
                                <span className="gradient-text block">Powered by AI</span>
                            </h2>

                            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                Never waste food again. Create complex multi-part recipes, scan international barcodes, import recipes from TikTok, get voice nutrition analysis, and discover what you can cook with what you have.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                <TouchEnhancedButton
                                    onClick={() => handleAuthNavigation('signup')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-105 text-center"
                                >
                                    {isNativeApp ? 'Create Account' : 'Start Managing Your Kitchen'}
                                </TouchEnhancedButton>
                                {!isNativeApp && (
                                    <button
                                        onClick={() => scrollToSection('features')}
                                        className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
                                    >
                                        See How It Works
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center space-x-6 text-sm text-gray-500 mb-8">
                                <div className="flex items-center">
                                    <span className="text-green-500 mr-2">✓</span>
                                    Multi-Part Recipes
                                </div>
                                <div className="flex items-center">
                                    <span className="text-green-500 mr-2">✓</span>
                                    Enhanced Recipe Search
                                </div>
                                <div className="flex items-center">
                                    <span className="text-green-500 mr-2">✓</span>
                                    Image Integration
                                </div>
                            </div>

                            {/* App Store Badges - MODIFIED for platform awareness */}
                            {!isNativeApp && (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="text-sm text-gray-600 font-medium">Available on all platforms:</div>
                                    <div className="flex gap-3">
                                        <TouchEnhancedButton
                                            onClick={() => window.open('https://play.google.com/store/apps/details?id=kitchen.docbearscomfort', '_blank')}
                                            className="block transition-transform hover:scale-105 active:scale-95"
                                            aria-label="Download Doc Bear's Comfort Kitchen from Google Play Store"
                                        >
                                            <Image
                                                src="/images/Google-Play-Store-Button.png"
                                                alt="Available at the Google Play Store"
                                                width={168}
                                                height={56}
                                                className="h-12 sm:h-14"
                                                style={{ width: 'auto', height: 'auto' }}
                                            />
                                        </TouchEnhancedButton>
                                        <TouchEnhancedButton
                                            onClick={() => alert('Coming soon to Apple App Store!')}
                                            className="block transition-transform hover:scale-105"
                                        >
                                            <Image
                                                src="/images/app-store-badge-coming-soon1.png"
                                                alt="Coming Soon to Apple App Store"
                                                width={168}
                                                height={56}
                                                className="h-12 sm:h-14"
                                                style={{ width: 'auto', height: 'auto' }}
                                            />
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            )}

                            {/* Native app message */}
                            {isNativeApp && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="text-green-700 text-sm">
                                        🎉 You're already using the {platform === 'ios' ? 'iOS' : 'Android'} app!
                                        Create an account to sync your data and unlock premium features.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Hero Screenshot - same as before */}
                        <div className="relative" style={{paddingLeft: '2rem'}}>
                            <div className="screenshot-container">
                                <div className="screenshot-phone relative mx-auto" style={{maxWidth: '24rem'}}>
                                    <div className="bg-black rounded-3xl p-2 shadow-2xl">
                                        <div className="w-full bg-gray-900 rounded-2xl overflow-hidden relative" style={{aspectRatio: '9/19.5'}}>
                                            <Image
                                                src="/images/hero-app-screenshot.jpg"
                                                alt="Doc Bear's App Dashboard"
                                                fill
                                                sizes="(max-width: 640px) 280px, 400px"
                                                priority
                                                className="object-cover z-10"
                                                onLoad={() => {
                                                    console.log('Hero image loaded successfully');
                                                    const fallback = document.querySelector('.hero-fallback');
                                                    if (fallback) fallback.style.display = 'none';
                                                }}
                                                onError={() => {
                                                    console.log('Hero image failed to load, showing fallback');
                                                    const fallback = document.querySelector('.hero-fallback');
                                                    if (fallback) fallback.style.display = 'flex';
                                                }}
                                            />
                                            <div className="hero-fallback absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white z-5">
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">🍳</div>
                                                    <div className="text-sm font-medium">Doc Bear's App</div>
                                                    <div className="text-xs opacity-75">v1.7.0</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="floating-items floating-top-left floating">
                                        <div className="text-xl">🧩</div>
                                        <div className="text-xs font-semibold text-gray-600">Multi-Part</div>
                                    </div>
                                    <div className="floating-items floating-bottom-right floating">
                                        <div className="text-xl">📸</div>
                                        <div className="text-xs font-semibold text-gray-600">Image Rich</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rest of the content - Features, How It Works, etc. - same as before but with conditional rendering for native apps */}
            {!isNativeApp && (
                <>
                    {/* Features Section */}
                    <section id="features" className="py-20 bg-white">
                        {/* ... your existing features section ... */}
                    </section>

                    {/* How It Works Section */}
                    <section className="py-20 bg-gray-50">
                        {/* ... your existing how it works section ... */}
                    </section>

                    {/* About Creator Section */}
                    <section className="py-20 bg-white">
                        {/* ... your existing about creator section ... */}
                    </section>

                    {/* Statistics Section */}
                    <section className="py-20 gradient-bg">
                        {/* ... your existing statistics section ... */}
                    </section>

                    {/* Final CTA Section */}
                    <section className="py-20 bg-gray-900">
                        {/* ... your existing final CTA section ... */}
                    </section>
                </>
            )}

            {/* For native apps, show simplified content focused on account creation */}
            {isNativeApp && (
                <section className="py-20 bg-white">
                    <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                            Welcome to Doc Bear's Comfort Kitchen!
                        </h2>
                        <p className="text-xl text-gray-600 mb-8">
                            You're using the {platform === 'ios' ? 'iOS' : 'Android'} app. Create an account to sync your data across devices and unlock premium features.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                            <TouchEnhancedButton
                                onClick={() => handleAuthNavigation('signup')}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-105"
                            >
                                Create Account
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => handleAuthNavigation('signin')}
                                className="border-2 border-gray-600 text-gray-700 hover:bg-gray-50 px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
                            >
                                Sign In
                            </TouchEnhancedButton>
                        </div>

                        <div className="text-gray-400 text-sm">
                            <p>✓ Sync across devices  ✓ Premium features  ✓ Multi-part recipes  ✓ AI-powered tools</p>
                        </div>
                    </div>
                </section>
            )}

            <Footer />
        </div>
    );
}