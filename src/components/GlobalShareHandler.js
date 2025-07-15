'use client';

// File: src/components/GlobalShareHandler.js - FIXED: Multi-platform support

import { useShareHandler } from '@/hooks/useShareHandler';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function GlobalShareHandler() {
    const router = useRouter();
    const [debugInfo, setDebugInfo] = useState('');

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-orange-500' : 'bg-blue-500';

        toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full opacity-0`;
        toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <span>${message}</span>
        </div>
    `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };

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
            if (process.env.NODE_ENV === 'development') {
                showToast(`🎯 JavaScript received share event!\nURL: ${event.detail?.url}\nSource: ${event.detail?.source}`);
            }
        };

        window.addEventListener('shareReceived', handleAnyShare);

        return () => {
            window.removeEventListener('shareReceived', handleAnyShare);
        };
    }, []);

    // FIXED: Global share handler that works for ALL platforms
    useShareHandler((shareData) => {
        console.log('🌍 useShareHandler callback called with:', shareData);

        if (process.env.NODE_ENV === 'development') {
            showToast(`🚀 Share handler triggered!\nURL: ${shareData.url}\nType: ${shareData.type}\nPlatform: ${shareData.platform}`);
        }

        setDebugInfo(`Last share: ${shareData.platform} from ${shareData.source}`);

        // UPDATED: Handle ALL social media platforms
        if (shareData.type === 'facebook_video' || shareData.type === 'tiktok_video' || shareData.type === 'instagram_video') {
            const encodedUrl = encodeURIComponent(shareData.url);
            const targetUrl = `/recipes/add?videoUrl=${encodedUrl}&source=share&platform=${shareData.platform}`;

            console.log(`🚀 Navigating to ${shareData.platform} import:`, targetUrl);
            router.push(targetUrl);
        }
    });

    return (
        <>
            {/* Show debug info always during development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed top-0 left-0 right-0 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 text-sm z-50">
                    <strong>Debug:</strong> GlobalShareHandler active (All platforms). {debugInfo || 'No shares yet.'}
                </div>
            )}
        </>
    );
}