'use client';
// file: /src/app/auth/signup/page.js v7 - Enhanced with international compliance and GDPR

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import TermsOfUse from '@/components/legal/TermsOfUse';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';
import MobileOptimizedLayout from "@/components/layout/MobileOptimizedLayout";
import KeyboardOptimizedInput from "@/components/forms/KeyboardOptimizedInput";

// Separate component for search params to wrap in Suspense
function SignUpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Create ref for success message section to scroll to
    const successMessageRef = useRef(null);

    // Get URL parameters from pricing page
    const urlTier = searchParams.get('tier') || 'free';
    const urlBilling = searchParams.get('billing') || 'annual';
    const urlTrial = searchParams.get('trial') === 'true';
    const urlSource = searchParams.get('source');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        country: '', // NEW: Country selection for international compliance
    });

    // NEW: International compliance state
    const [isEUUser, setIsEUUser] = useState(false);
    const [detectedCountry, setDetectedCountry] = useState('');
    const [showInternationalNotice, setShowInternationalNotice] = useState(false);

    // Pricing selection state
    const [selectedTier, setSelectedTier] = useState(urlTier);
    const [billingCycle, setBillingCycle] = useState(urlBilling);
    const [showPricingModal, setShowPricingModal] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

    // NEW: Enhanced consent tracking for international compliance
    const [acceptedDataProcessing, setAcceptedDataProcessing] = useState(false);
    const [acceptedVoiceProcessing, setAcceptedVoiceProcessing] = useState(false);
    const [acceptedInternationalTransfers, setAcceptedInternationalTransfers] = useState(false);
    const [acceptedMinorConsent, setAcceptedMinorConsent] = useState(false);
    const [isMinor, setIsMinor] = useState(false);
    const [parentEmail, setParentEmail] = useState('');

    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    // NEW: Country list for GDPR detection
    const euCountries = [
        'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
        'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
        'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
        'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia',
        'Slovenia', 'Spain', 'Sweden', 'Iceland', 'Liechtenstein', 'Norway'
    ];

    const countries = [
        'United States', 'Canada', 'United Kingdom', 'Australia', 'New Zealand',
        ...euCountries.sort(),
        'Japan', 'South Korea', 'Singapore', 'Other'
    ].sort();

    // NEW: Detect user region and show appropriate compliance notices
    useEffect(() => {
        const detectUserRegion = () => {
            try {
                // Simple EU detection based on timezone
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const euTimezones = [
                    'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Rome',
                    'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna',
                    'Europe/Prague', 'Europe/Warsaw', 'Europe/Stockholm', 'Europe/Copenhagen',
                    'Europe/Helsinki', 'Europe/Dublin', 'Europe/Lisbon', 'Europe/Athens',
                    'Europe/Budapest', 'Europe/Bucharest', 'Europe/Sofia', 'Europe/Zagreb',
                    'Europe/Ljubljana', 'Europe/Bratislava', 'Europe/Vilnius', 'Europe/Riga',
                    'Europe/Tallinn', 'Europe/Luxembourg', 'Europe/Malta', 'Europe/Nicosia'
                ];

                const isEU = euTimezones.includes(timezone);
                setIsEUUser(isEU);

                // Try to detect country from timezone
                if (timezone.startsWith('Europe/')) {
                    const city = timezone.split('/')[1];
                    const countryMap = {
                        'London': 'United Kingdom',
                        'Berlin': 'Germany',
                        'Paris': 'France',
                        'Rome': 'Italy',
                        'Madrid': 'Spain',
                        'Amsterdam': 'Netherlands',
                        'Brussels': 'Belgium',
                        // Add more mappings as needed
                    };
                    setDetectedCountry(countryMap[city] || '');
                }

                if (isEU) {
                    setShowInternationalNotice(true);
                }
            } catch (error) {
                console.error('Error detecting region:', error);
            }
        };

        detectUserRegion();
    }, []);

    // NEW: Update EU status when country is selected
    useEffect(() => {
        if (formData.country) {
            const isEUCountry = euCountries.includes(formData.country);
            setIsEUUser(isEUCountry);
            setShowInternationalNotice(isEUCountry);
        }
    }, [formData.country]);

    const tiers = [
        {
            id: 'free',
            name: 'Free',
            price: { monthly: 0, annual: 0 },
            description: 'Perfect for getting started with basic inventory management',
            features: [
                'Up to 50 inventory items',
                '100 starter recipes',
                'Basic "What Can I Make?" matching',
                'Simple shopping lists',
                'UPC scanning (10/month)',
                'Receipt scanning (2/month)'
            ],
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-900'
        },
        {
            id: 'gold',
            name: 'Gold',
            price: { monthly: 4.99, annual: 49.99 },
            description: 'Essential tools for active home cooks',
            features: [
                'Up to 250 inventory items',
                'Access to 500 recipes',
                'Advanced "What Can I Make?"',
                'Full meal planning (2 weeks)',
                'Unlimited UPC scanning',
                'Receipt scanning (20/month)',
                'Email notifications & alerts',
                'Plus more'
            ],
            bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
            borderColor: 'border-blue-300',
            textColor: 'text-blue-900',
            trialAvailable: true
        },
        {
            id: 'platinum',
            name: 'Platinum',
            price: { monthly: 9.99, annual: 99.99 },
            description: 'Complete kitchen management',
            features: [
                'Unlimited inventory items',
                'All Gold features',
                'Unlimited meal planning',
                'Advanced meal prep tools',
                'Nutrition goal tracking',
                'Dietary restriction & Ingredients to avoid control',
                'Priority support & early access',
                'Plus much more'
            ],
            bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50',
            borderColor: 'border-purple-300',
            textColor: 'text-purple-900',
            trialAvailable: true
        }
    ];

    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('at least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('one number');
        if (!/[!@#$%^&*]/.test(password)) errors.push('one special character (!@#$%^&*)');
        return errors;
    };

    const getPasswordRequirements = (password) => {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };
    };

    const getSavingsPercentage = (tier) => {
        if (tier.price.monthly === 0) return null;
        const monthlyCost = tier.price.monthly * 12;
        const savings = ((monthlyCost - tier.price.annual) / monthlyCost) * 100;
        return Math.round(savings);
    };

    const getSelectedTierData = () => {
        return tiers.find(tier => tier.id === selectedTier);
    };

    // Auto-scroll to success message when it appears
    useEffect(() => {
        if (success && successMessageRef.current) {
            setTimeout(() => {
                successMessageRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }, [success]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Client-side validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        const passwordErrors = validatePassword(formData.password);
        if (passwordErrors.length > 0) {
            setError(`Password must contain ${passwordErrors.join(', ')}`);
            setLoading(false);
            return;
        }

        if (!acceptedTerms || !acceptedPrivacy) {
            setError('You must accept both the Terms of Use and Privacy Policy to create an account');
            setLoading(false);
            return;
        }

        // NEW: Enhanced validation for international compliance
        if (isEUUser && !acceptedDataProcessing) {
            setError('EU users must consent to data processing under GDPR');
            setLoading(false);
            return;
        }

        if (isMinor && !acceptedMinorConsent) {
            setError('Parental consent is required for users under 18');
            setLoading(false);
            return;
        }

        if (isMinor && !parentEmail) {
            setError('Parent/guardian email is required for users under 18');
            setLoading(false);
            return;
        }

        try {
            const response = await apiPost('/api/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                country: formData.country,
                acceptedTerms: true,
                acceptedPrivacy: true,
                acceptanceDate: new Date().toISOString(),

                // NEW: Enhanced consent tracking
                isEUUser,
                acceptedDataProcessing: isEUUser ? acceptedDataProcessing : null,
                acceptedVoiceProcessing,
                acceptedInternationalTransfers,
                isMinor,
                parentEmail: isMinor ? parentEmail : null,
                acceptedMinorConsent: isMinor ? acceptedMinorConsent : null,

                // Subscription details
                selectedTier,
                billingCycle: selectedTier === 'free' ? null : billingCycle,
                startTrial: selectedTier !== 'free',
                source: urlSource
            });

            const data = await response.json();

            if (response.ok) {
                let successMessage = 'Account created successfully! Please check your email to verify your account before signing in.';

                if (isMinor) {
                    successMessage += ' A separate verification email has been sent to your parent/guardian.';
                }

                setSuccess(successMessage);
            } else {
                setError(data.error || 'An error occurred');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const openPrivacyModal = (e) => {
        e.preventDefault();
        setShowPrivacyModal(true);
        document.body.style.overflow = 'hidden';
    };

    const openTermsModal = (e) => {
        e.preventDefault();
        setShowTermsModal(true);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setShowPrivacyModal(false);
        setShowTermsModal(false);
        setShowPricingModal(false);
        document.body.style.overflow = 'unset';
    };

    const Modal = ({ isOpen, onClose, children, title, size = 'default' }) => {
        if (!isOpen) return null;

        const sizeClasses = {
            default: 'max-w-4xl',
            large: 'max-w-6xl'
        };

        return (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <div
                    className={`bg-white rounded-lg ${sizeClasses[size]} max-h-[90vh] overflow-auto relative shadow-xl`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
                            aria-label="Close"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                    <div className="p-0">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    const passwordReqs = getPasswordRequirements(formData.password);
    const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
    const passwordsDontMatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;
    const selectedTierData = getSelectedTierData();

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-safe">
                <div className="max-w-md w-full space-y-6" style={{ paddingTop: '60px' }}>
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Create your Doc Bear's Comfort Kitchen account
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Join thousands managing their food inventory smartly worldwide 🌍
                        </p>
                    </div>

                    {/* NEW: International Compliance Notice */}
                    {showInternationalNotice && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <div className="text-blue-600 mr-3 mt-0.5">
                                    🌍
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-blue-800">
                                        International User Detected
                                    </h3>
                                    <p className="text-sm text-blue-700 mt-1">
                                        {isEUUser ? (
                                            <>You appear to be in the EU/EEA. Additional data protection rights under GDPR apply to your account. We'll show relevant consent options below.</>
                                        ) : (
                                            <>You appear to be outside the US. We support international users with localized features and comply with applicable privacy laws.</>
                                        )}
                                    </p>
                                    {detectedCountry && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            Detected region: {detectedCountry}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pricing Tier Selection */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium text-gray-900">Choose Your Plan</h3>
                            <TouchEnhancedButton
                                onClick={() => setShowPricingModal(true)}
                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                Compare Plans
                            </TouchEnhancedButton>
                        </div>

                        {/* Billing Cycle Toggle */}
                        {selectedTier !== 'free' && (
                            <div className="flex items-center justify-center mb-4">
                                <div className="bg-gray-100 p-1 rounded-lg">
                                    <TouchEnhancedButton
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                                            billingCycle === 'monthly'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600'
                                        }`}
                                    >
                                        Monthly
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={() => setBillingCycle('annual')}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-all relative ${
                                            billingCycle === 'annual'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600'
                                        }`}
                                    >
                                        Annual
                                        {billingCycle === 'annual' && selectedTier !== 'free' && (
                                            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded-full">
                                                Save {getSavingsPercentage(selectedTierData)}%
                                            </span>
                                        )}
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}

                        {/* Tier Selection */}
                        <div className="space-y-2">
                            {tiers.map((tier) => (
                                <div
                                    key={tier.id}
                                    className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                        selectedTier === tier.id
                                            ? `${tier.borderColor} ${tier.bgColor}`
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => setSelectedTier(tier.id)}
                                >
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            name="tier"
                                            value={tier.id}
                                            checked={selectedTier === tier.id}
                                            onChange={() => setSelectedTier(tier.id)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        />
                                        <div className="ml-3 flex-1">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className={`font-semibold ${tier.textColor}`}>
                                                        {tier.name}
                                                        {tier.trialAvailable && (
                                                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                                7-Day Free Trial
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">{tier.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    {tier.price.monthly === 0 ? (
                                                        <span className="text-2xl font-bold text-gray-900">Free</span>
                                                    ) : (
                                                        <div>
                                                            <span className="text-2xl font-bold text-gray-900">
                                                                ${billingCycle === 'annual' ? tier.price.annual : tier.price.monthly}
                                                            </span>
                                                            <span className="text-gray-600 text-sm">
                                                                /{billingCycle === 'annual' ? 'year' : 'month'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Trial Info */}
                        {selectedTier !== 'free' && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center">
                                    <span className="text-green-600 text-sm">🎉</span>
                                    <p className="ml-2 text-sm text-green-800">
                                        <strong>7-Day Free Trial</strong> - Get full Platinum access! No payment required now.
                                        You'll be able to choose your subscription after the trial ends.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Success message with ref for auto-scroll and spam notice */}
                        {success && (
                            <div ref={successMessageRef} className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-md">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="font-medium">{success}</p>
                                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <h4 className="text-sm font-medium text-yellow-800">
                                                        📧 Check Your Email (Including Spam/Junk Folder)
                                                    </h4>
                                                    <div className="mt-2 text-sm text-yellow-700">
                                                        <p>
                                                            Your verification email should arrive within a few minutes.
                                                            <strong> If you don't see it in your inbox, please check your spam or junk folder.</strong>
                                                        </p>
                                                        <p className="mt-1">
                                                            The verification link is valid for <strong>7 days</strong> from now.
                                                        </p>
                                                        {isEUUser && (
                                                            <p className="mt-1 text-blue-700">
                                                                🇪🇺 <strong>EU users:</strong> Your data protection rights under GDPR are now active.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                    Full Name
                                </label>
                                <KeyboardOptimizedInput
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter your full name"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email Address
                                </label>
                                <KeyboardOptimizedInput
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* NEW: Country Selection for International Compliance */}
                            <div>
                                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                                    Country/Region
                                    {isEUUser && <span className="text-blue-600 ml-1">(GDPR Protected)</span>}
                                </label>
                                <select
                                    id="country"
                                    name="country"
                                    required
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="">Select your country</option>
                                    {countries.map(country => (
                                        <option key={country} value={country}>
                                            {country}
                                            {euCountries.includes(country) ? ' 🇪🇺' : ''}
                                        </option>
                                    ))}
                                </select>
                                {isEUUser && (
                                    <p className="mt-1 text-xs text-blue-600">
                                        EU/EEA residents have additional data protection rights under GDPR
                                    </p>
                                )}
                            </div>

                            {/* NEW: Age Verification for Minor Protection */}
                            <div className="border border-gray-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Age Verification</h4>
                                <div className="flex items-center mb-2">
                                    <input
                                        id="isMinor"
                                        type="checkbox"
                                        checked={isMinor}
                                        onChange={(e) => setIsMinor(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isMinor" className="ml-2 text-sm text-gray-700">
                                        I am under 18 years of age
                                    </label>
                                </div>

                                {isMinor && (
                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                        <h5 className="text-sm font-medium text-yellow-800 mb-2">
                                            👨‍👩‍👧‍👦 Parental Consent Required
                                        </h5>
                                        <p className="text-xs text-yellow-700 mb-3">
                                            Users under 18 must have verifiable parental or guardian consent.
                                            We comply with COPPA and GDPR requirements for minor protection.
                                        </p>
                                        <div>
                                            <label htmlFor="parentEmail" className="block text-sm font-medium text-yellow-800">
                                                Parent/Guardian Email Address *
                                            </label>
                                            <KeyboardOptimizedInput
                                                id="parentEmail"
                                                type="email"
                                                required={isMinor}
                                                value={parentEmail}
                                                onChange={(e) => setParentEmail(e.target.value)}
                                                className="mt-1 w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                                                placeholder="parent@example.com"
                                            />
                                            <p className="mt-1 text-xs text-yellow-600">
                                                Your parent/guardian will receive a separate email to verify consent
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <KeyboardOptimizedInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Create a secure password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                />
                            </div>

                            {/* Password Requirements Display */}
                            {(passwordFocused || formData.password) && (
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
                                    <div className="space-y-1">
                                        {[
                                            { key: 'length', label: 'At least 8 characters' },
                                            { key: 'uppercase', label: 'One uppercase letter (A-Z)' },
                                            { key: 'lowercase', label: 'One lowercase letter (a-z)' },
                                            { key: 'number', label: 'One number (0-9)' },
                                            { key: 'special', label: 'One special character (!@#$%^&*)' }
                                        ].map(req => (
                                            <div key={req.key} className="flex items-center text-xs">
                                                <span className={`mr-2 ${passwordReqs[req.key] ? 'text-green-600' : 'text-red-600'}`}>
                                                    {passwordReqs[req.key] ? '✓' : '✗'}
                                                </span>
                                                <span className={passwordReqs[req.key] ? 'text-green-700' : 'text-gray-600'}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                    Confirm Password
                                </label>
                                <KeyboardOptimizedInput
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Confirm your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />

                                {/* Password Match Indicator */}
                                {formData.confirmPassword && (
                                    <div className="mt-2">
                                        {passwordsMatch ? (
                                            <div className="flex items-center text-xs text-green-600">
                                                <span className="mr-2">✓</span>
                                                <span>Passwords match</span>
                                            </div>
                                        ) : passwordsDontMatch ? (
                                            <div className="flex items-center text-xs text-red-600">
                                                <span className="mr-2">✗</span>
                                                <span>Passwords do not match</span>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Legal Requirements Section */}
                        <div className="border-t border-gray-200 pt-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                <h3 className="text-sm font-medium text-blue-900 mb-2">
                                    📋 Legal Requirements
                                    {isEUUser && <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded">GDPR Protected</span>}
                                </h3>
                                <p className="text-xs text-blue-700 mb-3">
                                    To create your account, please review and accept our legal terms:
                                </p>

                                <div className="space-y-3">
                                    {/* Basic Terms and Privacy */}
                                    <div className="flex items-start">
                                        <input
                                            id="acceptPrivacy"
                                            type="checkbox"
                                            checked={acceptedPrivacy}
                                            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded flex-shrink-0 mt-0.5"
                                        />
                                        <label htmlFor="acceptPrivacy" className="ml-3 text-sm text-gray-700 leading-5">
                                            I have read and accept the{' '}
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={openPrivacyModal}
                                                className="text-indigo-600 hover:text-indigo-500 underline font-medium"
                                            >
                                                Privacy Policy
                                            </TouchEnhancedButton>
                                        </label>
                                    </div>

                                    <div className="flex items-start">
                                        <input
                                            id="acceptTerms"
                                            type="checkbox"
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded flex-shrink-0 mt-0.5"
                                        />
                                        <label htmlFor="acceptTerms" className="ml-3 text-sm text-gray-700 leading-5">
                                            I have read and accept the{' '}
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={openTermsModal}
                                                className="text-indigo-600 hover:text-indigo-500 underline font-medium"
                                            >
                                                Terms of Use
                                            </TouchEnhancedButton>
                                        </label>
                                    </div>

                                    {/* EU-Specific GDPR Consent */}
                                    {isEUUser && (
                                        <div className="border-t border-blue-200 pt-3 mt-3">
                                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                                🇪🇺 Additional EU/GDPR Consents
                                            </h4>
                                            <div className="space-y-2">
                                                <div className="flex items-start">
                                                    <input
                                                        id="acceptDataProcessing"
                                                        type="checkbox"
                                                        checked={acceptedDataProcessing}
                                                        onChange={(e) => setAcceptedDataProcessing(e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0 mt-0.5"
                                                    />
                                                    <label htmlFor="acceptDataProcessing" className="ml-3 text-xs text-blue-800 leading-4">
                                                        <strong>Data Processing Consent (Required):</strong> I consent to the processing of my personal data as described in the Privacy Policy, including for account management, service provision, and legitimate business interests under GDPR Article 6.
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Optional Voice Processing Consent */}
                                    <div className="border-t border-gray-200 pt-3 mt-3">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                            🎤 Optional Feature Consents
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex items-start">
                                                <input
                                                    id="acceptVoiceProcessing"
                                                    type="checkbox"
                                                    checked={acceptedVoiceProcessing}
                                                    onChange={(e) => setAcceptedVoiceProcessing(e.target.checked)}
                                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded flex-shrink-0 mt-0.5"
                                                />
                                                <label htmlFor="acceptVoiceProcessing" className="ml-3 text-xs text-gray-700 leading-4">
                                                    <strong>Voice Input Features (Optional):</strong> I consent to using voice input features. Voice is processed locally in my browser and not stored on servers. I can disable this anytime in my account settings.
                                                </label>
                                            </div>

                                            <div className="flex items-start">
                                                <input
                                                    id="acceptInternationalTransfers"
                                                    type="checkbox"
                                                    checked={acceptedInternationalTransfers}
                                                    onChange={(e) => setAcceptedInternationalTransfers(e.target.checked)}
                                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded flex-shrink-0 mt-0.5"
                                                />
                                                <label htmlFor="acceptInternationalTransfers" className="ml-3 text-xs text-gray-700 leading-4">
                                                    <strong>International Features (Optional):</strong> I consent to using international barcode scanning and product databases. Product codes may be shared with international databases for identification.
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Minor Consent */}
                                    {isMinor && (
                                        <div className="border-t border-yellow-200 pt-3 mt-3 bg-yellow-50 p-3 rounded">
                                            <div className="flex items-start">
                                                <input
                                                    id="acceptMinorConsent"
                                                    type="checkbox"
                                                    checked={acceptedMinorConsent}
                                                    onChange={(e) => setAcceptedMinorConsent(e.target.checked)}
                                                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded flex-shrink-0 mt-0.5"
                                                    required={isMinor}
                                                />
                                                <label htmlFor="acceptMinorConsent" className="ml-3 text-xs text-yellow-800 leading-4">
                                                    <strong>Parental Consent Confirmation:</strong> I confirm that I have obtained verifiable consent from my parent/guardian to create this account and use Doc Bear's Comfort Kitchen services. My parent/guardian will receive a separate verification email.
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Validation Warning */}
                                {(!acceptedTerms || !acceptedPrivacy || (isEUUser && !acceptedDataProcessing) || (isMinor && !acceptedMinorConsent)) && (
                                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                        ⚠️ Required consents must be selected to create your account
                                        {isEUUser && !acceptedDataProcessing && <span className="block">• EU users must consent to data processing under GDPR</span>}
                                        {isMinor && !acceptedMinorConsent && <span className="block">• Users under 18 must confirm parental consent</span>}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <TouchEnhancedButton
                                type="submit"
                                disabled={loading || !acceptedTerms || !acceptedPrivacy || (isEUUser && !acceptedDataProcessing) || (isMinor && (!acceptedMinorConsent || !parentEmail))}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating account...' : `Create account${isEUUser ? ' (GDPR Protected)' : ''}`}
                            </TouchEnhancedButton>
                        </div>

                        <div className="text-center">
                            <Link
                                href="/auth/signin"
                                className="text-indigo-600 hover:text-indigo-500"
                            >
                                Already have an account? Sign in
                            </Link>
                        </div>

                        {/* International Compliance Footer */}
                        {(isEUUser || formData.country) && (
                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 text-center">
                                <p>
                                    🌍 <strong>International User:</strong> We comply with applicable privacy laws including
                                    {isEUUser && ' GDPR (EU),'}
                                    {formData.country === 'United Kingdom' && ' UK GDPR,'}
                                    {formData.country === 'Canada' && ' PIPEDA (Canada),'}
                                    {formData.country === 'Australia' && ' Privacy Act (Australia),'}
                                    and other regional privacy regulations.
                                </p>
                                {isEUUser && (
                                    <p className="mt-1 text-blue-600">
                                        EU users have additional rights including data portability, erasure, and access under GDPR.
                                    </p>
                                )}
                            </div>
                        )}
                    </form>
                </div>
            </div>

            <Footer />

            {/* Rest of modals remain the same... */}
            <Modal
                isOpen={showPricingModal}
                onClose={closeModal}
                title="Compare Plans"
                size="large"
            >
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {tiers.map((tier) => {
                            const savings = getSavingsPercentage(tier);
                            return (
                                <div
                                    key={tier.id}
                                    className={`border-2 rounded-lg p-6 ${
                                        selectedTier === tier.id ? `${tier.borderColor} ${tier.bgColor}` : 'border-gray-200'
                                    }`}
                                >
                                    <div className="text-center mb-4">
                                        <h3 className={`text-xl font-bold ${tier.textColor} mb-2`}>
                                            {tier.name}
                                            {tier.trialAvailable && (
                                                <span className="block text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mt-1">
                                                    7-Day Free Trial
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-gray-600 text-sm mb-4">{tier.description}</p>

                                        <div className="mb-4">
                                            {tier.price.monthly === 0 ? (
                                                <div>
                                                    <span className="text-3xl font-bold text-gray-900">Free</span>
                                                    <div className="text-xs text-gray-500 mt-1">Forever</div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center justify-center">
                                                        <span className="text-3xl font-bold text-gray-900">
                                                            ${billingCycle === 'annual' ? tier.price.annual : tier.price.monthly}
                                                        </span>
                                                        <span className="text-gray-600 ml-1 text-sm">
                                                            /{billingCycle === 'annual' ? 'year' : 'month'}
                                                        </span>
                                                    </div>
                                                    {billingCycle === 'annual' && savings && (
                                                        <div className="text-xs text-green-600 font-semibold mt-1">
                                                            Save {savings}% vs monthly
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <TouchEnhancedButton
                                            onClick={() => {
                                                setSelectedTier(tier.id);
                                                closeModal();
                                            }}
                                            className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                                                selectedTier === tier.id
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {selectedTier === tier.id ? 'Selected' : 'Select Plan'}
                                        </TouchEnhancedButton>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-900 text-sm">What's Included:</h4>
                                        <ul className="space-y-1">
                                            {tier.features.map((feature, index) => (
                                                <li key={index} className="flex items-start space-x-2">
                                                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-sm text-gray-700">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">🎉 Free Trial Details</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• 7-day trial includes full <strong>Platinum</strong> access regardless of selected tier</li>
                            <li>• No payment required during signup</li>
                            <li>• After trial: choose to subscribe or continue with Free plan</li>
                            <li>• Cancel anytime during trial with no charges</li>
                        </ul>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showPrivacyModal}
                onClose={closeModal}
                title="Privacy Policy"
            >
                <PrivacyPolicy />
            </Modal>

            <Modal
                isOpen={showTermsModal}
                onClose={closeModal}
                title="Terms of Use"
            >
                <TermsOfUse />
            </Modal>
        </>
    );
}

// Main component wrapped with Suspense
export default function SignUp() {
    return (
        <Suspense fallback={
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        }>
            <SignUpContent />
        </Suspense>
    );
}