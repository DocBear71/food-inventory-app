// File: src/components/GlobalShareHandler.js
'use client';

import { useShareHandler } from '@/hooks/useShareHandler';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function GlobalShareHandler() {
    const router = useRouter();
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        console.log('🌍 GlobalShareHandler mounted!');
        return () => {
            console.log('🌍 GlobalShareHandler unmounted');
        };
    }, []);

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
        console.log('🌍 useShareHandler callback called with:', shareData);
        alert(`🚀 Share handler triggered!\nURL: ${shareData.url}\nType: ${shareData.type}`);

        setDebugInfo(`Last share: ${shareData.url} from ${shareData.source}`);

        if (shareData.type === 'facebook_video') {
            const encodedUrl = encodeURIComponent(shareData.url);
            const targetUrl = `/recipes/add?videoUrl=${encodedUrl}&source=share&platform=facebook`;

            console.log('🚀 Navigating to:', targetUrl);
            router.push(targetUrl);
        }
    });

    return (
        <>
            {/* Show debug info always during development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed top-0 left-0 right-0 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 text-sm z-50">
                    <strong>Debug:</strong> GlobalShareHandler active. {debugInfo || 'No shares yet.'}
                </div>
            )}
        </>
    );
}