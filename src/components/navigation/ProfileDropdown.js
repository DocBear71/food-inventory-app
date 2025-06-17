'use client';
// file: /src/components/navigation/ProfileDropdown.js


import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function ProfileDropdown() {
    const { data: session } = useSafeSession();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!session?.user) {
        return null;
    }

    const handleSignOut = async () => {
        await signOut({ redirect: false });
        router.push('/auth/signin');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <TouchEnhancedButton
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 bg-white text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block">{session.user.name || session.user.email}</span>
                <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </TouchEnhancedButton>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                        {/* User Info Header */}
                        <div className="px-4 py-2 border-b border-gray-200">
                            <p className="text-sm font-medium text-gray-900">
                                {session.user.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {session.user.email}
                            </p>
                        </div>

                        {/* Profile Link */}
                        <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="flex items-center">
                                <span className="mr-2">👤</span>
                                Profile Settings
                            </div>
                        </Link>

                        {/* Dashboard Link */}
                        <Link
                            href="/dashboard"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="flex items-center">
                                <span className="mr-2">🏠</span>
                                Dashboard
                            </div>
                        </Link>

                        {/* Change Password Link */}
                        <Link
                            href="/profile/change-password"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="flex items-center">
                                <span className="mr-2">🔒</span>
                                Change Password
                            </div>
                        </Link>

                        <div className="border-t border-gray-200"></div>

                        {/* Sign Out */}
                        <TouchEnhancedButton
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <div className="flex items-center">
                                <span className="mr-2">🚪</span>
                                Sign Out
                            </div>
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}
        </div>
    );
}
