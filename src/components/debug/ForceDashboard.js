'use client';

// Create this file: /src/components/debug/ForceDashboard.js
// Component to force redirect to dashboard when authenticated

import { useEffect, useState } from 'react';

export default function ForceDashboard() {
    const [sessionStatus, setSessionStatus] = useState('checking');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        async function checkAndRedirect() {
            try {
                const { Capacitor } = await import('@capacitor/core');
                const isNative = Capacitor.isNativePlatform();

                if (isNative) {
                    const { Preferences } = await import('@capacitor/preferences');
                    
                    const [sessionResult, authFlagResult] = await Promise.all([
                        Preferences.get({ key: 'mobile_session' }),
                        Preferences.get({ key: 'is_authenticated' })
                    ]);

                    console.log('🔍 Force Dashboard Check:', {
                        hasSession: !!sessionResult.value,
                        authFlag: authFlagResult.value,
                        currentPath: window.location.pathname
                    });

                    if (sessionResult.value && authFlagResult.value === 'true') {
                        const session = JSON.parse(sessionResult.value);
                        setUserEmail(session.user?.email || 'Unknown');
                        setSessionStatus('authenticated');

                        // If we're not on dashboard and user is authenticated, redirect
                        if (window.location.pathname !== '/dashboard') {
                            console.log('🚀 Force redirecting authenticated user to dashboard...');
                            
                            // Force redirect after a small delay
                            setTimeout(() => {
                                window.location.href = '/dashboard';
                            }, 100);
                        }
                    } else {
                        setSessionStatus('unauthenticated');
                    }
                } else {
                    setSessionStatus('web');
                }
            } catch (error) {
                console.error('Force dashboard check error:', error);
                setSessionStatus('error');
            }
        }

        checkAndRedirect();
        
        // Check every 2 seconds if we're still on the wrong page
        const interval = setInterval(checkAndRedirect, 2000);
        
        return () => clearInterval(interval);
    }, []);

    if (sessionStatus === 'authenticated' && window.location.pathname !== '/dashboard') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Authenticated as {userEmail}</p>
                    <p className="text-gray-600">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return null;
}