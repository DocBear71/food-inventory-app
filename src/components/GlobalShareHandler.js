// File: src/components/GlobalShareHandler.js
'use client';

import { useShareHandler } from '@/hooks/useShareHandler';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function GlobalShareHandler() {
    const router = useRouter();
    const [debugInfo, setDebugInfo] = useState('');

    // ADD: Listen for ANY custom events
    useEffect(() => {
        const handleAnyShare = (event) => {
            console.log('🎯 shareReceived event detected:', event.detail);
            alert(`🎯 JavaScript received share event!\nURL: ${event.detail?.url}\nSource: ${event.detail?.source}`);
        };

        window.addEventListener('shareReceived', handleAnyShare);

        return () => {
            window.removeEventListener('shareReceived', handleAnyShare);
        };
    }, []);

    // Global share handler that works from any page
    useShareHandler((shareData) => {
        console.log('🌍 Global share received:', shareData);

        // ADD: Debug alert to see if it's working
        alert(`🎯 Share received!\nURL: ${shareData.url}\nSource: ${shareData.source}\nType: ${shareData.type}`);

        setDebugInfo(`Last share: ${shareData.url} from ${shareData.source}`);

        if (shareData.type === 'facebook_video') {
            // Navigate to recipe import page with the shared URL
            const encodedUrl = encodeURIComponent(shareData.url);
            const targetUrl = `/recipes/add?videoUrl=${encodedUrl}&source=share&platform=facebook`;

            console.log('🚀 Navigating to:', targetUrl);
            router.push(targetUrl);
        }
    });

    // This component doesn't render anything visible
    // But you can add debug info during development
    return (
        <>
            {/* DEBUG: Show share info during development */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
                <div
                    className="fixed top-0 left-0 right-0 bg-green-100 border border-green-400 text-green-700 px-4 py-3 text-sm z-50">
                    <strong>Debug:</strong> {debugInfo}
                </div>
            )}
        </>
    );
}