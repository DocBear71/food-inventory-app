'use client';

// Create this file: /src/components/debug/SessionDebug.js
// Component to debug session state

import { useState, useEffect } from 'react';

export default function SessionDebug() {
    const [sessionData, setSessionData] = useState(null);
    const [authFlag, setAuthFlag] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        async function checkAllSessions() {
            try {
                // Check platform
                const { Capacitor } = await import('@capacitor/core');
                const native = Capacitor.isNativePlatform();
                setIsNative(native);

                if (native) {
                    const { Preferences } = await import('@capacitor/preferences');
                    
                    const [session, auth, user] = await Promise.all([
                        Preferences.get({ key: 'mobile_session' }),
                        Preferences.get({ key: 'is_authenticated' }),
                        Preferences.get({ key: 'current_user' })
                    ]);

                    setSessionData(session.value ? JSON.parse(session.value) : null);
                    setAuthFlag(auth.value);
                    setUserData(user.value ? JSON.parse(user.value) : null);
                }
            } catch (error) {
                console.error('Session debug error:', error);
            }
        }

        checkAllSessions();
    }, []);

    const handleManualRedirect = () => {
        window.location.href = '/dashboard';
    };

    const handleClearSession = async () => {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.clear();
            console.log('All sessions cleared');
            window.location.reload();
        } catch (error) {
            console.error('Clear session error:', error);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg max-w-sm z-50">
            <h3 className="font-bold text-sm mb-2">Session Debug</h3>
            
            <div className="text-xs space-y-1">
                <div>Platform: {isNative ? 'Native' : 'Web'}</div>
                <div>Auth Flag: {authFlag || 'null'}</div>
                <div>Has Session: {sessionData ? '✅' : '❌'}</div>
                <div>Has User: {userData ? '✅' : '❌'}</div>
                
                {userData && (
                    <div>User: {userData.email}</div>
                )}
                
                {sessionData && (
                    <div>Session Expires: {new Date(sessionData.expires).toLocaleTimeString()}</div>
                )}
            </div>

            <div className="mt-3 space-y-2">
                <button
                    onClick={handleManualRedirect}
                    className="w-full bg-blue-500 text-white text-xs px-2 py-1 rounded"
                >
                    Go to Dashboard
                </button>
                
                <button
                    onClick={handleClearSession}
                    className="w-full bg-red-500 text-white text-xs px-2 py-1 rounded"
                >
                    Clear Session
                </button>
            </div>
        </div>
    );
}