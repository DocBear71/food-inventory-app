// Create this file: /src/components/NativeAuthHandler.js
// Simplified version to work with your existing CapacitorAuthProvider

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Capacitor } from '@capacitor/core';

export default function NativeAuthHandler({ children }) {
    const { data: session, status, update } = useSession();
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            console.log('🔧 Native Auth Handler: Native platform detected');
            console.log('📱 Session status:', status, 'Session exists:', !!session);

            // Set initial load complete after a short delay to allow auth provider to work
            const timer = setTimeout(() => {
                setInitialLoadComplete(true);
                console.log('✅ Initial load complete');
            }, 3000);

            // Handle app becoming visible (user returns to app)
            const handleVisibilityChange = async () => {
                if (!document.hidden && status === 'unauthenticated') {
                    console.log('👀 App became visible, refreshing session...');
                    setTimeout(async () => {
                        try {
                            await update();
                            console.log('✅ Session refresh completed');
                        } catch (error) {
                            console.error('❌ Session refresh failed:', error);
                        }
                    }, 1000);
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                clearTimeout(timer);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        } else {
            // For web, mark as complete immediately
            setInitialLoadComplete(true);
        }
    }, [status, session, update]);

    // For native apps, show loading state only during initial load
    if (Capacitor.isNativePlatform() && !initialLoadComplete && status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your kitchen...</p>
                    <p className="text-sm text-gray-500 mt-2">Checking authentication</p>
                </div>
            </div>
        );
    }

    return children;
}