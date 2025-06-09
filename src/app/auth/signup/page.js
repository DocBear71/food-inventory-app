// file: /src/app/auth/signup/page.js - COMPLETELY CLEAN VERSION

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import TermsOfUse from '@/components/legal/TermsOfUse';
import Footer from '@/components/legal/Footer';

export default function SignUp() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const router = useRouter();

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

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        if (!acceptedTerms || !acceptedPrivacy) {
            setError('You must accept both the Terms of Use and Privacy Policy to create an account');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    acceptedTerms: true,
                    acceptedPrivacy: true,
                    acceptanceDate: new Date().toISOString(),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Account created successfully! You can now sign in.');
                setTimeout(() => {
                    router.push('/auth/signin');
                }, 2000);
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
        document.body.style.overflow = 'unset';
    };

    const Modal = ({ isOpen, onClose, children, title }) => {
        if (!isOpen) return null;

        return (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto relative shadow-xl"
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

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Create your Doc Bear's Comfort Food account
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Join thousands managing their food inventory smartly
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                {success}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                    Full Name
                                </label>
                                <input
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
                                <input
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

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter your password (min 6 characters)"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Confirm your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-gray-200 pt-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                <h3 className="text-sm font-medium text-blue-900 mb-2">
                                    📋 Legal Requirements
                                </h3>
                                <p className="text-xs text-blue-700 mb-3">
                                    To create your account, please review and accept our legal terms:
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-start">
                                        <input
                                            id="acceptPrivacy"
                                            type="checkbox"
                                            checked={acceptedPrivacy}
                                            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="acceptPrivacy" className="ml-2 text-sm text-gray-700">
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
                                            className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-700">
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
                                </div>

                                {(!acceptedTerms || !acceptedPrivacy) && (
                                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                        ⚠️ Both checkboxes must be selected to create your account
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <TouchEnhancedButton
                                type="submit"
                                disabled={loading || !acceptedTerms || !acceptedPrivacy}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating account...' : 'Create account'}
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
                    </form>
                </div>
                <Footer />
            </div>

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