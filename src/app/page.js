'use client';

// Modern Landing Page for Doc Bear's Comfort Kitchen
// file: /app/page.js - Updated for v1.6.0

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/legal/Footer'

// Image Carousel Component
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

export default function LandingPage() {
    const [isScrolled, setIsScrolled] = useState(false);

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

    return (
        <div className="bg-gray-50">
            {/* Styles */}
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
                    height: 36rem; /* 36rem would be 144px, but 9rem (144px) matches other feature images */
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

                    /* Mobile-specific adjustments */
                    .hero-section {
                        padding-left: 0 !important;
                    }

                    .hero-spacing {
                        padding-top: 4rem;
                        padding-bottom: 3rem;
                    }
                }
            `}</style>

            {/* Navigation */}
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
                            <Link
                                href="/recipe-search"
                                className="text-gray-600 hover:text-gray-900 px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
                            >
                                Recipes
                            </Link>
                            <Link
                                href="/pricing"
                                className="text-gray-600 hover:text-gray-900 px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
                            >
                                Pricing
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="text-gray-600 hover:text-gray-900 px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/auth/signup"
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium shadow-sm transition-all hover:shadow-md"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden hero-pattern hero-spacing">
                <div className="max-w-7xl mx-auto px-4 sm:px-3 lg:px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Column: Content */}
                        <div className="fade-in">
                            {/* Brand title - moved from navbar */}
                            <div className="mb-4">
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Doc Bear's Comfort Kitchen</h1>
                                <p className="text-sm text-gray-600">AI-Powered Food Management</p>
                            </div>

                            <div className="inline-flex items-center bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                                <span className="mr-2">🆕</span>
                                Version 1.6.0 - Multi-Part Recipes & Superior UX
                            </div>

                            <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                                Smart Food Inventory
                                <span className="gradient-text block">Powered by AI</span>
                            </h2>

                            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                Never waste food again. Create complex multi-part recipes, scan international barcodes, import recipes from TikTok, get voice nutrition analysis, and discover what you can cook with what you have.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                <Link
                                    href="/auth/signup"
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-105 text-center"
                                >
                                    Start Managing Your Kitchen
                                </Link>
                                <button
                                    onClick={() => scrollToSection('features')}
                                    className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
                                >
                                    See How It Works
                                </button>
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

                            {/* App Store Badges */}
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="text-sm text-gray-600 font-medium">Available on all platforms:</div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => alert('Coming soon to Google Play Store!')}
                                        className="block transition-transform hover:scale-105"
                                    >
                                        <Image
                                            src="/images/playStore-comingsoon.png"
                                            alt="Coming Soon to Google Play Store"
                                            width={168}
                                            height={56}
                                            className="h-12 sm:h-14"
                                            style={{ width: 'auto', height: 'auto' }}
                                        />
                                    </button>
                                    <button
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
                                    </button>
                                </div>
                            </div>
                        </div>
                        <br/>
                        <br/>
                        {/* Right Column: Hero Screenshot */}
                        <div className="relative" style={{paddingLeft: '2rem'}}>
                            <div className="screenshot-container">
                                <div className="screenshot-phone relative mx-auto" style={{maxWidth: '24rem'}}>
                                    <div className="bg-black rounded-3xl p-2 shadow-2xl">
                                        <div className="w-full bg-gray-900 rounded-2xl overflow-hidden relative" style={{aspectRatio: '9/19.5'}}>
                                            {/* Try to load the hero image */}
                                            <Image
                                                src="/images/hero-app-screenshot.jpg"
                                                alt="Doc Bear's App Dashboard"
                                                fill
                                                sizes="(max-width: 640px) 280px, 400px"
                                                priority
                                                className="object-cover z-10"
                                                onLoad={() => {
                                                    console.log('Hero image loaded successfully');
                                                    // Hide fallback when image loads
                                                    const fallback = document.querySelector('.hero-fallback');
                                                    if (fallback) fallback.style.display = 'none';
                                                }}
                                                onError={() => {
                                                    console.log('Hero image failed to load, showing fallback');
                                                    // Show fallback when image fails
                                                    const fallback = document.querySelector('.hero-fallback');
                                                    if (fallback) fallback.style.display = 'flex';
                                                }}
                                            />
                                            {/* Fallback content */}
                                            <div className="hero-fallback absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white z-5">
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">🍳</div>
                                                    <div className="text-sm font-medium">Doc Bear's App</div>
                                                    <div className="text-xs opacity-75">v1.6.0</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Floating elements positioned to not overlap badges */}
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

            {/* Features Section */}
            <section id="features" className="py-20 bg-white">
                <br/>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need to Manage Your Kitchen
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            From multi-part recipe management to international barcode scanning, Doc Bear&apos;s Comfort Kitchen brings professional-grade food management to your home.
                        </p>
                    </div>
                    <br/>
                    {/* Feature Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Multi-Part Recipe Management */}
                        <div className="feature-card bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100">
                            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-2xl text-white">🧩</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Multi-Part Recipe Management</h3>
                            <p className="text-gray-600 mb-6">
                                Create complex recipes with multiple sections like "Filling" and "Topping" for dishes like Chicken Pot Pie. Perfect for professional-style cooking.
                            </p>
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <ImageCarousel
                                    images={[
                                        '/images/multipart-recipe1.jpg',
                                        '/images/multipart-recipe2.jpg',
                                        '/images/multipart-recipe3.jpg'
                                    ]}
                                    alt="Multi-Part Recipe Creation"
                                    interval={3000}
                                />
                            </div>
                        </div>

                        {/* Enhanced Recipe Discovery */}
                        <div className="feature-card bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
                            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-2xl text-white">🔍</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Superior Recipe Discovery</h3>
                            <p className="text-gray-600 mb-6">
                                Advanced search with beautiful image-rich recipe cards, ratings, reviews, and intelligent filtering by category, difficulty, and dietary restrictions.
                            </p>
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <ImageCarousel
                                    images={[
                                        '/images/recipe-search1.jpg',
                                        '/images/recipe-search2.jpg',
                                        '/images/recipe-search3.jpg'
                                    ]}
                                    alt="Enhanced Recipe Search"
                                    interval={2800}
                                />
                            </div>
                        </div>

                        {/* International Barcode Scanning */}
                        <div className="feature-card bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border border-orange-100">
                            <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-2xl text-white">🌍</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">International Barcode Scanner</h3>
                            <p className="text-gray-600 mb-6">
                                Scan barcodes from 80+ countries. Supports EAN-8, EAN-13, UPC-A, and GTIN-14 formats with automatic regional optimization.
                            </p>
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <Image
                                    src="/images/barcode-scanning-demo.jpg"
                                    alt="Barcode Scanning"
                                    width={200}
                                    height={120}
                                    className="w-full rounded-lg"
                                />
                            </div>
                        </div>

                        {/* AI Recipe Matching */}
                        <div className="feature-card bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
                            <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-2xl text-white">🤖</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">AI Recipe Matching</h3>
                            <p className="text-gray-600 mb-6">
                                Discover recipes you can make with your current inventory, including complex multi-part recipes. Advanced percentage matching with smart suggestions.
                            </p>
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <ImageCarousel
                                    images={[
                                        '/images/recipe-matching1.jpg',
                                        '/images/recipe-matching2.jpg',
                                        '/images/recipe-matching3.jpg'
                                    ]}
                                    alt="Recipe Matching Process"
                                    interval={3000}
                                />
                            </div>
                        </div>

                        {/* Voice Nutrition Analysis */}
                        <div className="feature-card bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
                            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-2xl text-white">🎤</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Voice Nutrition Analysis</h3>
                            <p className="text-gray-600 mb-6">
                                Ask about nutrition information using natural voice commands. Get instant AI-powered analysis with comprehensive breakdowns for all recipe parts.
                            </p>
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <Image
                                    src="/images/voice-nutrition-demo.jpg"
                                    alt="Voice Analysis"
                                    width={200}
                                    height={120}
                                    className="w-full rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Social Media Recipe Import */}
                        <div className="feature-card bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-8 border border-pink-100">
                            <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center mb-6">
                                <span className="text-2xl text-white">📱</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Social Media Recipe Import</h3>
                            <p className="text-gray-600 mb-6">
                                Import recipes directly from TikTok, Instagram, and Facebook videos. AI analyzes content and can detect multi-part recipes automatically.
                            </p>
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <ImageCarousel
                                    images={[
                                        '/images/social-media1.jpg',
                                        '/images/social-media2.jpg',
                                        '/images/social-media3.jpg',
                                        '/images/social-media4.jpg',
                                        '/images/social-media5.jpg'
                                    ]}
                                    alt="Social Media Import Process"
                                    interval={2500}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <br/>
            </section>


            {/* How It Works Section */}
            <section className="py-20 bg-gray-50">
                <br/>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                            See How It Works
                        </h2>
                        <p className="text-xl text-gray-600">
                            From multi-part recipe creation to cooking - experience the complete food management workflow
                        </p>
                    </div>
                    <br/>
                    {/* Workflow Steps */}
                    <div className="grid lg:grid-cols-3 gap-12">
                        {/* Step 1: Create & Import */}
                        <div className="text-center">
                            <div className="relative mb-8">
                                <div className="screenshot-container">
                                    <div className="bg-black rounded-2xl p-2 shadow-xl max-w-xs mx-auto">
                                        <div className="w-full h-80 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">🧩</div>
                                                <div className="text-sm font-medium">Create & Import</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -top-3 -right-3 bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Create & Import</h3>
                            <p className="text-gray-600">
                                Create complex multi-part recipes or import from social media with AI-powered extraction and beautiful image integration.
                            </p>
                        </div>

                        {/* Step 2: Discover & Plan */}
                        <div className="text-center">
                            <div className="relative mb-8">
                                <div className="screenshot-container">
                                    <div className="bg-black rounded-2xl p-2 shadow-xl max-w-xs mx-auto">
                                        <div className="w-full h-80 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">🔍</div>
                                                <div className="text-sm font-medium">Discover & Plan</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -top-3 -right-3 bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Discover & Plan</h3>
                            <p className="text-gray-600">
                                Use enhanced recipe search and AI matching to discover what you can make, including complex multi-part recipes. Plan meals intelligently.
                            </p>
                        </div>

                        {/* Step 3: Cook & Track */}
                        <div className="text-center">
                            <div className="relative mb-8">
                                <div className="screenshot-container">
                                    <div className="bg-black rounded-2xl p-2 shadow-xl max-w-xs mx-auto">
                                        <div className="w-full h-80 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white">
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">🍳</div>
                                                <div className="text-sm font-medium">Cook & Track</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -top-3 -right-3 bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Cook & Track</h3>
                            <p className="text-gray-600">
                                Follow multi-part recipe instructions, get voice nutrition analysis, scale recipes intelligently, and track your cooking progress.
                            </p>
                        </div>
                    </div>
                </div>
                <br/>
            </section>

            {/* About Creator Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                                From a Marine Veteran & Culinary/Food Safety Expert
                            </h2>
                            <p className="text-xl text-gray-600 mb-6">
                                Created by <strong>Dr. Edward McKeown</strong>, U.S. Marine Corps veteran and author of the &quot;Doc Bear&apos;s Comfort Food Survival Guide&quot; cookbook series.
                            </p>
                            <p className="text-gray-600 mb-8">
                                With over 30 years in hospitality management, food safety expertise, and a Ph.D. in Hospitality & Tourism Management, Dr. McKeown combines culinary knowledge with modern AI technology to help families reduce food waste and discover new recipes.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <div className="bg-gray-100 rounded-lg px-4 py-2">
                                    <span className="text-sm font-medium text-gray-700">ServSafe Certified</span>
                                </div>
                                <div className="bg-gray-100 rounded-lg px-4 py-2">
                                    <span className="text-sm font-medium text-gray-700">30+ Years Experience</span>
                                </div>
                                <div className="bg-gray-100 rounded-lg px-4 py-2">
                                    <span className="text-sm font-medium text-gray-700">Ph.D. Hospitality Management</span>
                                </div>
                            </div>
                        </div>
                        <br/>
                        <div className="text-center lg:text-right">
                            <div className="relative inline-block">
                                <div className="w-64 h-64 rounded-full overflow-hidden border-8 border-purple-100 shadow-xl mx-auto lg:mr-0">
                                    <Image
                                        src="/icons/edmckeown.jpg"
                                        alt="Dr. Edward McKeown"
                                        width={256}
                                        height={256}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="hidden w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 items-center justify-center text-white text-6xl">👨‍🍳</div>
                                </div>
                                <br/>
                                <br/>
                                <div className="badge-positioning bg-white rounded-2xl px-6 py-3 shadow-lg">
                                    <div className="text-sm font-bold text-gray-900">Dr. Edward McKeown</div>
                                    <div className="text-xs text-gray-500">U.S. Marine Corps Veteran</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <br/>
            </section>

            {/* Statistics Section */}
            <section className="py-20 gradient-bg">
                <br/>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                            Trusted by Food Enthusiasts Worldwide
                        </h2>
                        <p className="text-xl text-purple-100">
                            Join thousands who are already managing their kitchens smarter with v1.6.0
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8 text-center">
                        <div className="glass-effect rounded-2xl p-8">
                            <div className="text-4xl font-bold text-white mb-2">80+</div>
                            <div className="text-purple-100">Countries Supported</div>
                        </div>
                        <div className="glass-effect rounded-2xl p-8">
                            <div className="text-4xl font-bold text-white mb-2">650+</div>
                            <div className="text-purple-100">Recipes Available</div>
                        </div>
                        <div className="glass-effect rounded-2xl p-8">
                            <div className="text-4xl font-bold text-white mb-2">40+</div>
                            <div className="text-purple-100">Currencies Supported</div>
                        </div>
                        <div className="glass-effect rounded-2xl p-8">
                            <div className="text-4xl font-bold text-white mb-2">Multi-Part</div>
                            <div className="text-purple-100">Recipe Support</div>
                        </div>
                    </div>
                </div>
                <br/>
            </section>

            {/* Final CTA Section */}
            <section className="py-20 bg-gray-900">
                <br/>
                <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                        Ready to Transform Your Kitchen?
                    </h2>
                    <p className="text-xl text-gray-300 mb-8">
                        Start managing your food inventory today with AI-powered intelligence. Create multi-part recipes, discover new dishes, and never waste food again.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/auth/signup"
                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-105"
                        >
                            Get Started for Free
                        </Link>
                        <Link
                            href="/auth/signin"
                            className="border-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>

                    <div className="mt-8 text-gray-400 text-sm">
                        <p>✓ Free to start  ✓ No credit card required  ✓ Multi-part recipes  ✓ International support</p>
                        <div className="flex justify-center items-center gap-4 mt-4">
                            <span className="text-xs">Also coming to:</span>

                            <button
                                onClick={() => alert('Coming soon to Google Play Store!')}
                                className="transition-transform hover:scale-105"
                            >
                                <Image
                                    src="/images/playStore-comingsoon.png"
                                    alt="Coming Soon to Google Play Store"
                                    width={120}
                                    height={32}
                                    className="h-8"
                                    style={{ width: 'auto', height: 'auto' }}
                                />
                            </button>
                            <button
                                onClick={() => alert('Coming soon to Apple App Store!')}
                                className="transition-transform hover:scale-105"
                            >
                                <Image
                                    src="/images/app-store-badge-coming-soon1.png"
                                    alt="Coming Soon to Apple App Store"
                                    width={120}
                                    height={32}
                                    className="h-8"
                                    style={{ width: 'auto', height: 'auto' }}
                                />
                            </button>
                        </div>
                    </div>
                </div>
                <br/>
            </section>
            <Footer />
        </div>
    );
}