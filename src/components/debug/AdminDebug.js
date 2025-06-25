// Create this component to debug admin status in PWA
// file: /src/components/debug/AdminDebug.js

'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useSafeSession } from '@/hooks/useSafeSession';

export default function AdminDebug() {
    const { data: session } = useSafeSession();
    const subscription = useSubscription();
    const [debugInfo, setDebugInfo] = useState(null);

    const checkAdminStatus = async () => {
        try {
            // Direct API call to check what the server returns
            const response = await fetch('/api/subscription/status?' + new URLSearchParams({
                t: Date.now(),
                debug: 'true'
            }), {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            });

            const data = await response.json();

            setDebugInfo({
                timestamp: new Date().toISOString(),
                apiResponse: data,
                subscriptionHook: {
                    tier: subscription.tier,
                    isAdmin: subscription.isAdmin,
                    loading: subscription.loading,
                    error: subscription.error
                },
                session: {
                    email: session?.user?.email,
                    id: session?.user?.id
                },
                environment: {
                    userAgent: navigator.userAgent,
                    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
                    isPWA: window.navigator.standalone || document.referrer.includes('android-app://'),
                }
            });
        } catch (error) {
            setDebugInfo({
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    };

    // Only show in development or for admin emails
    const adminEmails = ['e.g.mckeown@gmail.com', 'admin@docbearscomfortkitchen.com'];
    const shouldShow = process.env.NODE_ENV === 'development' ||
        adminEmails.includes(session?.user?.email?.toLowerCase());

    if (!shouldShow) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                onClick={checkAdminStatus}
                className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg"
            >
                Debug Admin
            </button>

            {debugInfo && (
                <div className="fixed inset-4 bg-black bg-opacity-90 z-50 overflow-auto">
                    <div className="bg-white p-4 m-4 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Admin Debug Info</h3>
                            <button
                                onClick={() => setDebugInfo(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                        <div className="mt-4 space-y-2">
                            <button
                                onClick={() => subscription.refetch()}
                                className="bg-blue-600 text-white px-3 py-2 rounded mr-2"
                            >
                                Force Refresh Subscription
                            </button>
                            <button
                                onClick={() => {
                                    if ('caches' in window) {
                                        caches.keys().then(names => {
                                            names.forEach(name => {
                                                caches.delete(name);
                                            });
                                        });
                                    }
                                    window.location.reload();
                                }}
                                className="bg-red-600 text-white px-3 py-2 rounded"
                            >
                                Clear Cache & Reload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}