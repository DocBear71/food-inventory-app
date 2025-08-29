'use client';

// file: /src/components/recipes/SocialMediaShare.js

import React, { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';

export function SocialMediaShare({ recipe }) {
    const [shareOpen, setShareOpen] = useState(false);
    const [copying, setCopying] = useState(false);

    const shareUrl = `${window.location.origin}/recipes/${recipe.id}`;
    const shareText = `Check out this amazing recipe: ${recipe.title}`;

    const socialPlatforms = [
        {
            name: 'Facebook',
            icon: '📘',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            color: 'bg-blue-600 hover:bg-blue-700'
        },
        {
            name: 'Twitter',
            icon: '🐦',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
            color: 'bg-sky-500 hover:bg-sky-600'
        },
        {
            name: 'Pinterest',
            icon: '📌',
            url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareText)}&media=${encodeURIComponent(recipe.primaryPhoto?.url || '')}`,
            color: 'bg-red-600 hover:bg-red-700'
        },
        {
            name: 'WhatsApp',
            icon: '💬',
            url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
            color: 'bg-green-600 hover:bg-green-700'
        },
        {
            name: 'Instagram',
            icon: '📷',
            action: 'instagram',
            color: 'bg-pink-600 hover:bg-pink-700'
        }
    ];

    const handleShare = async (platform) => {
        MobileHaptics?.light();

        if (platform.action === 'instagram') {
            await handleInstagramShare();
        } else {
            window.open(platform.url, '_blank', 'width=600,height=400');
        }
    };

    const handleInstagramShare = async () => {
        try {
            // Generate Instagram story image
            const response = await fetch('/api/recipes/social/instagram-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipeId: recipe.id,
                    title: recipe.title,
                    imageUrl: recipe.primaryPhoto?.url
                })
            });

            if (response.ok) {
                const { storyImageUrl } = await response.json();

                // Copy to clipboard and show instructions
                await navigator.clipboard.writeText(shareUrl);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showSuccess({
                    title: 'URL Copied',
                    message: 'Recipe URL copied to clipboard! Now you can paste it in your Instagram story.'
                });

                // Open Instagram in a new tab
                window.open('https://www.instagram.com', '_blank');
            }
        } catch (error) {
            console.error('Error sharing to Instagram:', error);
            // Fallback - just copy URL
            await copyToClipboard();
        }
    };

    const copyToClipboard = async () => {
        try {
            setCopying(true);
            await navigator.clipboard.writeText(shareUrl);
            MobileHaptics?.success();

            setTimeout(() => setCopying(false), 2000);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            MobileHaptics?.error();
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: recipe.title,
                    text: shareText,
                    url: shareUrl,
                });
                MobileHaptics?.success();
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            setShareOpen(true);
        }
    };

    return (
        <div className="relative">
            <TouchEnhancedButton
                onClick={handleNativeShare}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
                <span>📤</span>
                <span>Share Recipe</span>
            </TouchEnhancedButton>

            {/* Social Media Options Modal */}
            {shareOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Share Recipe</h3>
                            <TouchEnhancedButton
                                onClick={() => setShareOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </TouchEnhancedButton>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {socialPlatforms.map((platform) => (
                                <TouchEnhancedButton
                                    key={platform.name}
                                    onClick={() => handleShare(platform)}
                                    className={`flex items-center space-x-2 ${platform.color} text-white p-3 rounded-lg`}
                                >
                                    <span className="text-xl">{platform.icon}</span>
                                    <span>{platform.name}</span>
                                </TouchEnhancedButton>
                            ))}
                        </div>

                        <TouchEnhancedButton
                            onClick={copyToClipboard}
                            className="w-full bg-gray-100 text-gray-800 p-3 rounded-lg hover:bg-gray-200"
                        >
                            {copying ? '✅ Copied!' : '📋 Copy Link'}
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
