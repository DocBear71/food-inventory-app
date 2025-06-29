'use client';

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import { MobileSession } from '@/lib/mobile-session-simple';

export default function ProfilePage() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const [debugInfo, setDebugInfo] = useState('Initializing...');

    // Debug effect to track what's happening
    useEffect(() => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Profile page effect - Status: ${status}, Has session: ${!!session}`);

        if (status === 'loading') {
            setDebugInfo('Waiting for session to load...');
            return;
        }

        if (status === 'unauthenticated') {
            setDebugInfo('Not authenticated, redirecting...');
            console.log('Profile: Redirecting to sign in');
            router.push('/auth/signin');
            return;
        }

        if (status === 'authenticated' && session) {
            setDebugInfo('Session loaded successfully!');
            console.log('Profile: Session loaded:', {
                userId: session.user?.id,
                email: session.user?.email,
                tier: session.user?.effectiveTier
            });
        }
    }, [status, session, router]);

    const debugMobileSession = async () => {
        console.log('🔍 Manual mobile session debug triggered...');
        await MobileSession.debugSession();
    };

    // Show loading state
    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading profile...</div>
                        <div className="text-sm text-gray-500 mt-2">{debugInfo}</div>
                        <div className="text-xs text-gray-400 mt-4">
                            Status: {status} | Has Session: {!!session ? 'Yes' : 'No'}
                        </div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Show not authenticated state
    if (!session) {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-lg text-gray-600">Redirecting to sign in...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Show the actual profile content
    return (
        <MobileOptimizedLayout>
            <div className="max-w-4xl mx-auto py-6 px-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

                {/* Debug Info Panel (remove this once working) */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Debug Info</h3>
                    <div className="text-xs text-blue-700 space-y-1">
                        <div>Status: {status}</div>
                        <div>User ID: {session.user?.id}</div>
                        <div>Email: {session.user?.email}</div>
                        <div>Name: {session.user?.name}</div>
                        <div>Tier: {session.user?.effectiveTier}</div>
                        <div>Debug: {debugInfo}</div>
                    </div>
                </div>

                <div className="mt-4">
                    <button
                        onClick={debugMobileSession}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Debug Mobile Session
                    </button>
                </div>

                {/* Basic Profile Content */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">User Information</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <div className="mt-1 text-sm text-gray-900">{session.user?.name || 'Not set'}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <div className="mt-1 text-sm text-gray-900">{session.user?.email || 'Not set'}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Subscription Tier</label>
                                <div className="mt-1 text-sm text-gray-900">{session.user?.effectiveTier || 'free'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MobileOptimizedLayout>
    );
}