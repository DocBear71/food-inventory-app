// file: /src/app/debug/page.js - Create this page to test detection

'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
    const [debugInfo, setDebugInfo] = useState({});
    const [capacitorStatus, setCapacitorStatus] = useState('Checking...');

    useEffect(() => {
        const gatherDebugInfo = async () => {
            const info = {
                // Basic environment
                userAgent: navigator.userAgent,
                location: window.location.href,
                protocol: window.location.protocol,

                // Window objects
                hasCapacitor: typeof window.Capacitor !== 'undefined',
                hasCordova: typeof window.cordova !== 'undefined',
                hasPhoneGap: typeof window.PhoneGap !== 'undefined',

                // Process environment
                nodeEnv: process.env.NODE_ENV,
                capacitorPlatform: process.env.CAPACITOR_PLATFORM,

                // Platform info
                platformInfo: window.platformInfo || 'Not set',

                // Document properties
                documentURL: document.URL,
                documentDomain: document.domain,
                documentReferrer: document.referrer,
            };

            // Try to get Capacitor info
            if (typeof window.Capacitor !== 'undefined') {
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    info.capacitorDetails = {
                        isNativePlatform: Capacitor.isNativePlatform(),
                        getPlatform: Capacitor.getPlatform(),
                        isPluginAvailable: Capacitor.isPluginAvailable('Device'),
                    };
                    setCapacitorStatus('✅ Available');
                } catch (error) {
                    info.capacitorError = error.message;
                    setCapacitorStatus('❌ Error loading');
                }
            } else {
                setCapacitorStatus('❌ Not available');
            }

            setDebugInfo(info);
        };

        gatherDebugInfo();

        // Listen for platform events
        const handlePlatformDetected = (event) => {
            console.log('Debug page received platform event:', event.detail);
            setDebugInfo(prev => ({
                ...prev,
                platformEvent: event.detail
            }));
        };

        window.addEventListener('platformDetected', handlePlatformDetected);

        return () => {
            window.removeEventListener('platformDetected', handlePlatformDetected);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">🔍 Platform Detection Debug</h1>

                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Capacitor Status: {capacitorStatus}</h2>

                    {debugInfo.capacitorDetails && (
                        <div className="bg-green-50 p-4 rounded mb-4">
                            <h3 className="font-semibold">✅ Capacitor Details:</h3>
                            <pre className="text-sm mt-2">{JSON.stringify(debugInfo.capacitorDetails, null, 2)}</pre>
                        </div>
                    )}

                    {debugInfo.capacitorError && (
                        <div className="bg-red-50 p-4 rounded mb-4">
                            <h3 className="font-semibold">❌ Capacitor Error:</h3>
                            <pre className="text-sm mt-2">{debugInfo.capacitorError}</pre>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Environment Details</h2>
                    <div className="space-y-2 text-sm">
                        <div><strong>User Agent:</strong> <code className="bg-gray-100 p-1 rounded text-xs">{debugInfo.userAgent}</code></div>
                        <div><strong>Location:</strong> <code className="bg-gray-100 p-1 rounded">{debugInfo.location}</code></div>
                        <div><strong>Protocol:</strong> <code className="bg-gray-100 p-1 rounded">{debugInfo.protocol}</code></div>
                        <div><strong>Document URL:</strong> <code className="bg-gray-100 p-1 rounded">{debugInfo.documentURL}</code></div>
                        <div><strong>Node ENV:</strong> <code className="bg-gray-100 p-1 rounded">{debugInfo.nodeEnv}</code></div>
                        <div><strong>Capacitor Platform:</strong> <code className="bg-gray-100 p-1 rounded">{debugInfo.capacitorPlatform || 'undefined'}</code></div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Window Objects</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>window.Capacitor: {debugInfo.hasCapacitor ? '✅ Yes' : '❌ No'}</div>
                        <div>window.cordova: {debugInfo.hasCordova ? '✅ Yes' : '❌ No'}</div>
                        <div>window.PhoneGap: {debugInfo.hasPhoneGap ? '✅ Yes' : '❌ No'}</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Platform Detection Results</h2>

                    {debugInfo.platformInfo && typeof debugInfo.platformInfo === 'object' && (
                        <div className="bg-blue-50 p-4 rounded mb-4">
                            <h3 className="font-semibold">window.platformInfo:</h3>
                            <pre className="text-sm mt-2">{JSON.stringify(debugInfo.platformInfo, null, 2)}</pre>
                        </div>
                    )}

                    {debugInfo.platformEvent && (
                        <div className="bg-purple-50 p-4 rounded">
                            <h3 className="font-semibold">Platform Event Received:</h3>
                            <pre className="text-sm mt-2">{JSON.stringify(debugInfo.platformEvent, null, 2)}</pre>
                        </div>
                    )}
                </div>

                <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-2">🧪 Manual Tests</h3>
                    <div className="space-y-2 text-sm">
                        <button
                            onClick={() => console.log('window.Capacitor:', window.Capacitor)}
                            className="bg-blue-500 text-white px-3 py-1 rounded mr-2"
                        >
                            Log window.Capacitor
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const { Capacitor } = await import('@capacitor/core');
                                    console.log('Capacitor import successful:', {
                                        isNativePlatform: Capacitor.isNativePlatform(),
                                        getPlatform: Capacitor.getPlatform()
                                    });
                                } catch (error) {
                                    console.error('Capacitor import failed:', error);
                                }
                            }}
                            className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                        >
                            Test Capacitor Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}