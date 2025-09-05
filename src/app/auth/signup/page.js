'use client';
// file: /src/app/auth/signup/page.js v7 - Enhanced with international compliance and GDPR

import {useState, useEffect, Suspense, useRef} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import TermsOfUse from '@/components/legal/TermsOfUse';
import Footer from '@/components/legal/Footer';
import {apiPost} from '@/lib/api-config';
import MobileOptimizedLayout from "@/components/layout/MobileOptimizedLayout";
import {
    NativeTextInput,
    NativeSelect,
    NativeCheckbox,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';
import {PlatformDetection} from "@/utils/PlatformDetection.js";

// Separate component for search params to wrap in Suspense
function SignUpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Create ref for success message section to scroll to
    const successMessageRef = useRef(null);
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
    const [showPricingModal, setShowPricingModal] = useState(false);

    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [acceptedMarketing, setAcceptedMarketing] = useState(false);
    const [birthDate, setBirthDate] = useState('');
    const [showCookieConsent, setShowCookieConsent] = useState(false);

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

    const tiers = [
        {
            id: 'free',
            name: 'Free',
            price: {monthly: 0, annual: 0},
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
            price: {monthly: 4.99, annual: 49.99},
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
            price: {monthly: 9.99, annual: 99.99},
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

    useEffect(() => {
        // Check if user has already accepted cookies
        const cookieConsent = localStorage.getItem('cookieConsent');
        if (!cookieConsent && isEUUser) {
            setShowCookieConsent(true);
        }
    }, [isEUUser]);

    const calculateAge = (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate);
        const age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            return age - 1;
        }
        return age;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');
        setError(''); // Clear any previous errors

        // Visual debugging - show progress
        setError('DEBUG: Starting signup process...');

        // iOS-specific form validation
        if (PlatformDetection.isIOS()) {
            // Force iOS to complete any pending input
            const activeElement = document.activeElement;
            if (activeElement && activeElement.blur) {
                activeElement.blur();
            }

            // Visual debug checkpoint
            setError('DEBUG: iOS processing complete, validating fields...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Give time to see message
        }

        // 🍎 Native iOS form submit haptic
        try {
            const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.formSubmit();
        } catch (error) {
            console.log('Form submit haptic failed:', error);
        }

        // Visual debug - show what we're validating
        setError(`DEBUG: Validating - Name: ${!!formData.name}, Email: ${!!formData.email}, Password: ${!!formData.password}, Confirm: ${!!formData.confirmPassword}, Terms: ${acceptedTerms}, Privacy: ${acceptedPrivacy}`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Validate required fields
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Form Incomplete',
                message: 'Please fill in all required fields.'
            });

            // Error haptic feedback
            try {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();
            } catch (error) {
                console.log('Error haptic failed:', error);
            }

            setLoading(false);
            return;
        }

        // Validate password match
        if (formData.password !== formData.confirmPassword) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Password Mismatch',
                message: 'Passwords do not match. Please check and try again.'
            });

            try {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();
            } catch (error) {
                console.log('Error haptic failed:', error);
            }

            setLoading(false);
            return;
        }

        // Validate password requirements
        if (!passwordReqs.length || !passwordReqs.uppercase || !passwordReqs.lowercase || !passwordReqs.number) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Password Requirements',
                message: 'Password does not meet the requirements.'
            });

            try {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();
            } catch (error) {
                console.log('Error haptic failed:', error);
            }

            setLoading(false);
            return;
        }

        // Visual debug - about to make API call
        setError('DEBUG: All validation passed, making API call...');
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const response = await apiPost('/api/auth/register', {
                ...formData,

                // Required legal acceptance
                acceptedTerms,
                acceptedPrivacy,
                acceptanceDate: new Date().toISOString(),

                // International compliance fields
                isEUUser,
                acceptedDataProcessing: isEUUser ? acceptedDataProcessing : null,
                acceptedVoiceProcessing,
                acceptedInternationalTransfers,

                // Minor protection fields
                isMinor,
                parentEmail: isMinor ? parentEmail : null,
                acceptedMinorConsent: isMinor ? acceptedMinorConsent : null,

                // Optional marketing
                acceptedMarketing
            });

            // Visual debug - got response
            setError(`DEBUG: Got response - OK: ${response.ok}, Status: ${response.status}`);
            await new Promise(resolve => setTimeout(resolve, 500));

            const data = await response.json();
            setError(`DEBUG: Parsed JSON - Success: ${data.success}`);
            await new Promise(resolve => setTimeout(resolve, 500));

            if (response.ok && data.success) {
                // Success haptic feedback
                try {
                    const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();
                } catch (error) {
                    console.log('Success haptic failed:', error);
                }

                setSuccess(data.message || 'Account created successfully! Please check your email to verify your account.');

                // Clear form and scroll to success message (same as before)
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    country: '',
                });

                if (successMessageRef.current) {
                    successMessageRef.current.scrollIntoView({behavior: 'smooth'});
                }
            } else {
                // 🍎 Error haptic feedback
                try {
                    const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();
                } catch (error) {
                    console.log('Error haptic failed:', error);
                }

                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Account Creation Failed',
                    message: data.error || 'Failed to create account. Please try again.'
                });
            }
        } catch (error) {
            console.error('Signup error:', error);

            // 🍎 Error haptic feedback
            try {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();
            } catch (error) {
                console.log('Error haptic failed:', error);
            }

            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error. Please check your connection and try again.'
            });
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

    const Modal = ({isOpen, onClose, children, title, size = 'default'}) => {
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
                    <div
                        className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
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

    return (
        <>
            <div
                className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-safe">
                <div className="max-w-md w-full space-y-6" style={{paddingTop: '60px'}}>
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
                                            <>You appear to be in the EU/EEA. Additional data protection rights under
                                                GDPR apply to your account. We'll show relevant consent options
                                                below.</>
                                        ) : (
                                            <>You appear to be outside the US. We support international users with
                                                localized features and comply with applicable privacy laws.</>
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

                    {/* Free Account Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="text-center">
                            <div className="text-4xl mb-3">🎉</div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">
                                Everyone Starts with a Free Account
                            </h3>
                            <p className="text-blue-800 mb-4">
                                Create your free account now and explore our basic features. Once you're ready,
                                you can activate a <strong>7-day free Platinum trial</strong> (no credit card required)
                                to experience all premium features.
                            </p>

                            <div className="bg-white rounded-lg p-4 mb-4">
                                <h4 className="font-semibold text-gray-900 mb-2">Free Account Includes:</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                    <li>✅ Up to 50 inventory items</li>
                                    <li>✅ 100 starter recipes</li>
                                    <li>✅ Basic recipe matching</li>
                                    <li>✅ Simple shopping lists</li>
                                    <li>✅ UPC scanning (10/month)</li>
                                    <li>✅ Receipt scanning (2/month)</li>
                                </ul>
                            </div>

                            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-4">
                                <h4 className="font-semibold text-purple-900 mb-2">Ready for More?</h4>
                                <p className="text-purple-800 text-sm mb-3">
                                    After creating your account, activate your free 7-day Platinum trial for unlimited access to all features.
                                </p>
                                <TouchEnhancedButton
                                    onClick={() => setShowPricingModal(true)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                    View All Plans & Features
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>

                    {/* Success message with ref for auto-scroll and spam notice */}
                    {success && (
                        <div ref={successMessageRef}
                             className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-md">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400 mt-0.5" fill="currentColor"
                                         viewBox="0 0 20 20">
                                        <path fillRule="evenodd"
                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                              clipRule="evenodd"/>
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="font-medium">{success}</p>

                                    {/* Navigation to Sign In */}
                                    <div className="mt-4">
                                        <Link
                                            href="/auth/signin"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                        >
                                            Continue to Sign In →
                                        </Link>
                                    </div>

                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-yellow-400" fill="currentColor"
                                                     viewBox="0 0 20 20">
                                                    <path fillRule="evenodd"
                                                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                          clipRule="evenodd"/>
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h4 className="text-sm font-medium text-yellow-800">
                                                    📧 Check Your Email (Including Spam/Junk Folder)
                                                </h4>
                                                <div className="mt-2 text-sm text-yellow-700">
                                                    <p>
                                                        Your verification email should arrive within a few
                                                        minutes.
                                                        <strong> If you don't see it in your inbox, please check
                                                            your spam or junk folder.</strong>
                                                    </p>
                                                    <p className="mt-1">
                                                        The verification link is valid for <strong>7
                                                        days</strong> from now.
                                                    </p>
                                                    {isEUUser && (
                                                        <p className="mt-1 text-blue-700">
                                                            🇪🇺 <strong>EU users:</strong> Your data protection
                                                            rights under GDPR are now active.
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
                    {!success && (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name
                                    </label>
                                    <NativeTextInput
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        placeholder="Enter your full name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        validation={(value) => ({
                                            isValid: value.length >= 2 && value.length <= 50,
                                            message: value.length >= 2 ? 'Name looks good!' : 'Name should be at least 2 characters'
                                        })}
                                        errorMessage="Please enter your full name"
                                        successMessage="Name looks good!"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <NativeTextInput
                                        id="email"
                                        name="email"
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        required
                                        placeholder="Enter your email address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        validation={ValidationPatterns.email}
                                        errorMessage="Please enter a valid email address"
                                        successMessage="Email format is correct"
                                    />
                                </div>

                                {/* NEW: Country Selection for International Compliance */}
                                <div>
                                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                                        Country/Region
                                        {isEUUser && <span className="text-blue-600 ml-1">(GDPR Protected)</span>}
                                    </label>
                                    <NativeSelect
                                        id="country"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        placeholder="Select your country"
                                        required
                                        validation={ValidationPatterns.required}
                                        errorMessage="Please select your country"
                                        successMessage="Country selected"
                                        options={countries.map(country => ({
                                            value: country,
                                            label: `${country}${euCountries.includes(country) ? ' 🇪🇺' : ''}`
                                        }))}
                                    />
                                    {isEUUser && (
                                        <p className="mt-1 text-xs text-blue-600">
                                            EU/EEA residents have additional data protection rights under GDPR
                                        </p>
                                    )}
                                </div>

                                {/* NEW: Age Verification for Minor Protection */}
                                <div className="border border-gray-200 rounded-lg p-3">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Age Verification</h4>
                                    <NativeCheckbox
                                        id="isMinor"
                                        checked={isMinor}
                                        onChange={(e) => setIsMinor(e.target.checked)}
                                        label="I am under 18 years of age"
                                    />

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
                                                <label htmlFor="parentEmail"
                                                       className="block text-sm font-medium text-yellow-800">
                                                    Parent/Guardian Email Address *
                                                </label>
                                                <NativeTextInput
                                                    id="parentEmail"
                                                    type="email"
                                                    required={isMinor}
                                                    value={parentEmail}
                                                    onChange={(e) => setParentEmail(e.target.value)}
                                                    placeholder="parent@example.com"
                                                    validation={ValidationPatterns.email}
                                                    errorMessage="Please enter a valid parent/guardian email"
                                                    successMessage="Email format is correct"
                                                />
                                                <p className="mt-1 text-xs text-yellow-600">
                                                    Your parent/guardian will receive a separate email to verify consent
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                        Password
                                    </label>
                                    <NativeTextInput
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        placeholder="Create a secure password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        validation={ValidationPatterns.password}
                                        errorMessage="Password does not meet requirements"
                                        successMessage="Strong password!"
                                    />
                                </div>

                                {/* Password Requirements Display */}
                                {(passwordFocused || formData.password) && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Password
                                            Requirements:</h4>
                                        <div className="space-y-1">
                                            {[
                                                {key: 'length', label: 'At least 8 characters'},
                                                {key: 'uppercase', label: 'One uppercase letter (A-Z)'},
                                                {key: 'lowercase', label: 'One lowercase letter (a-z)'},
                                                {key: 'number', label: 'One number (0-9)'},
                                                {key: 'special', label: 'One special character (!@#$%^&*)'}
                                            ].map(req => (
                                                <div key={req.key} className="flex items-center text-xs">
                                                <span
                                                    className={`mr-2 ${passwordReqs[req.key] ? 'text-green-600' : 'text-red-600'}`}>
                                                    {passwordReqs[req.key] ? '✓' : '✗'}
                                                </span>
                                                    <span
                                                        className={passwordReqs[req.key] ? 'text-green-700' : 'text-gray-600'}>
                                                    {req.label}
                                                </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="confirmPassword"
                                           className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm Password
                                    </label>
                                    <NativeTextInput
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        validation={(value) => ({
                                            isValid: value === formData.password && value.length > 0,
                                            message: value === formData.password && value.length > 0 ? 'Passwords match!' : 'Passwords do not match'
                                        })}
                                        errorMessage="Passwords do not match"
                                        successMessage="Passwords match!"
                                    />
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
                                        <NativeCheckbox
                                            id="acceptPrivacy"
                                            checked={acceptedPrivacy}
                                            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                                        >
                                            I have read and accept the{' '}
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={openPrivacyModal}
                                                className="text-indigo-600 hover:text-indigo-500 underline font-medium"
                                            >
                                                Privacy Policy
                                            </TouchEnhancedButton>
                                        </NativeCheckbox>

                                        <NativeCheckbox
                                            id="acceptTerms"
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        >
                                            I have read and accept the{' '}
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={openTermsModal}
                                                className="text-indigo-600 hover:text-indigo-500 underline font-medium"
                                            >
                                                Terms of Use
                                            </TouchEnhancedButton>
                                        </NativeCheckbox>

                                        {isEUUser && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                                <h4 className="text-sm font-medium text-blue-900">🛡️ Your GDPR
                                                    Rights</h4>
                                                <p className="text-xs text-blue-700 mt-1">
                                                    As an EU resident, you have the right to access, correct, delete, or
                                                    export your data.
                                                    You can also withdraw consent at any time. Contact
                                                    privacy@docbear.com or use your
                                                    account settings to exercise these rights.
                                                </p>
                                            </div>
                                        )}

                                        {/* EU-Specific GDPR Consent */}
                                        {isEUUser && (
                                            <div className="border-t border-blue-200 pt-3 mt-3">
                                                <h4 className="text-sm font-medium text-blue-900 mb-2">
                                                    🇪🇺 Additional EU/GDPR Consents
                                                </h4>
                                                <div className="space-y-2">
                                                    <NativeCheckbox
                                                        id="acceptDataProcessing"
                                                        checked={acceptedDataProcessing}
                                                        onChange={(e) => setAcceptedDataProcessing(e.target.checked)}
                                                    >
                                                        <span className="text-xs text-blue-800 leading-4">
                                                            <strong>Data Processing Consent (Required):</strong>
                                                            I consent to the processing of my personal data as described
                                                            in the Privacy Policy, including for account management,
                                                            service provision, and legitimate business interests under
                                                            GDPR Article 6.
                                                        </span>
                                                    </NativeCheckbox>
                                                </div>
                                            </div>
                                        )}

                                        {/* Optional Voice Processing Consent */}
                                        <div className="border-t border-gray-200 pt-3 mt-3">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                🎤 Optional Feature Consents
                                            </h4>
                                            <div className="space-y-2">
                                                <NativeCheckbox
                                                    id="acceptVoiceProcessing"
                                                    checked={acceptedVoiceProcessing}
                                                    onChange={(e) => setAcceptedVoiceProcessing(e.target.checked)}
                                                >
                                                    <span className="text-xs text-gray-700 leading-4">
                                                        <strong>Voice Input Features (Optional):</strong>
                                                        I consent to using voice input features. Voice is processed
                                                        locally in my browser and not stored on servers. I can disable
                                                        this anytime in my account settings.
                                                    </span>
                                                </NativeCheckbox>

                                                <NativeCheckbox
                                                    id="acceptInternationalTransfers"
                                                    checked={acceptedInternationalTransfers}
                                                    onChange={(e) => setAcceptedInternationalTransfers(e.target.checked)}
                                                >
                                                    <span className="text-xs text-gray-700 leading-4">
                                                        <strong>International Features (Optional):</strong>
                                                        I consent to using international barcode scanning and product
                                                        databases. Product codes may be shared with international
                                                        databases for identification.
                                                    </span>
                                                </NativeCheckbox>
                                            </div>
                                        </div>

                                        <NativeCheckbox
                                            id="acceptMarketing"
                                            checked={acceptedMarketing}
                                            onChange={(e) => setAcceptedMarketing(e.target.checked)}
                                        >
                                            <span className="text-xs text-gray-700 leading-4">
                                                <strong>Marketing Communications (Optional):</strong>
                                                I would like to receive newsletters, product updates,
                                                and promotional offers. You can unsubscribe anytime.
                                            </span>
                                        </NativeCheckbox>

                                        {showCookieConsent && (
                                            <div
                                                className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
                                                <div
                                                    className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between">
                                                    <p className="text-sm mb-2 sm:mb-0">
                                                        We use cookies to enhance your experience. By continuing to use
                                                        our site,
                                                        you agree to our cookie policy.
                                                    </p>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                localStorage.setItem('cookieConsent', 'accepted');
                                                                setShowCookieConsent(false);
                                                            }}
                                                            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                localStorage.setItem('cookieConsent', 'declined');
                                                                setShowCookieConsent(false);
                                                            }}
                                                            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}


                                        {/* Minor Consent */}
                                        {isMinor && (
                                            <div>
                                                <label htmlFor="birthDate"
                                                       className="block text-sm font-medium text-gray-700">
                                                    Date of Birth *
                                                </label>
                                                <input
                                                    id="birthDate"
                                                    type="date"
                                                    required
                                                    max={new Date().toISOString().split('T')[0]}
                                                    value={birthDate}
                                                    onChange={(e) => {
                                                        setBirthDate(e.target.value);
                                                        const age = calculateAge(e.target.value);
                                                        setIsMinor(age < 18);
                                                    }}
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                                {birthDate && (
                                                    <p className="mt-1 text-xs text-gray-600">
                                                        Age: {calculateAge(birthDate)} years old
                                                        {isMinor &&
                                                            <span className="text-yellow-600 ml-2">⚠️ Parental consent required</span>}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Validation Warning */}
                                    {(!acceptedTerms || !acceptedPrivacy || (isEUUser && !acceptedDataProcessing) || (isMinor && !acceptedMinorConsent)) && (
                                        <div
                                            className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                            ⚠️ Required consents must be selected to create your account
                                            {isEUUser && !acceptedDataProcessing &&
                                                <span className="block">• EU users must consent to data processing under GDPR</span>}
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
                                <div
                                    className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 text-center">
                                    <p>
                                        🌍 <strong>International User:</strong> We comply with applicable privacy laws
                                        including
                                        {isEUUser && ' GDPR (EU),'}
                                        {formData.country === 'United Kingdom' && ' UK GDPR,'}
                                        {formData.country === 'Canada' && ' PIPEDA (Canada),'}
                                        {formData.country === 'Australia' && ' Privacy Act (Australia),'}
                                        and other regional privacy regulations.
                                    </p>
                                    {isEUUser && (
                                        <p className="mt-1 text-blue-600">
                                            EU users have additional rights including data portability, erasure, and
                                            access under GDPR.
                                        </p>
                                    )}
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>

            <Footer/>

            {/* Rest of modals remain the same... */}

            <Modal
                isOpen={showPricingModal}
                onClose={closeModal}
                title="Compare Plans"
                size="large"
            >
                <div className="p-6">
                    <div className="text-center mb-6">
                        <p className="text-gray-600">
                            Everyone starts with a free account. After signup, you can activate a 7-day free trial or subscribe anytime.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {tiers.map((tier) => {
                            const savings = getSavingsPercentage(tier);
                            return (
                                <div
                                    key={tier.id}
                                    className={`border-2 rounded-lg p-6 border-gray-200 hover:border-gray-300`}
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
                                                ${tier.price.annual}
                                            </span>
                                                        <span className="text-gray-600 ml-1 text-sm">/year</span>
                                                    </div>
                                                    {savings && (
                                                        <div className="text-xs text-green-600 font-semibold mt-1">
                                                            Save {savings}% vs monthly
                                                        </div>
                                                    )}
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        ${tier.price.monthly}/month if billed monthly
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-900 text-sm">What's Included:</h4>
                                        <ul className="space-y-1">
                                            {tier.features.map((feature, index) => (
                                                <li key={index} className="flex items-start space-x-2">
                                                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-sm text-gray-700">{feature.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">After Creating Your Free Account:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>✓ Start using free features immediately</li>
                            <li>✓ Activate 7-day Platinum trial anytime (no credit card needed)</li>
                            <li>✓ Subscribe to Gold or Platinum when ready</li>
                            <li>✓ Cancel or downgrade anytime</li>
                        </ul>
                    </div>

                    <div className="mt-4 text-center">
                        <TouchEnhancedButton
                            onClick={closeModal}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium"
                        >
                            Got It - Create Free Account
                        </TouchEnhancedButton>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showPrivacyModal}
                onClose={closeModal}
                title="Privacy Policy"
            >
                <PrivacyPolicy/>
            </Modal>

            <Modal
                isOpen={showTermsModal}
                onClose={closeModal}
                title="Terms of Use"
            >
                <TermsOfUse/>
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
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        }>
            <SignUpContent/>
        </Suspense>
    );
}