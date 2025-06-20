'use client';
// file: /src/components/sharing/EmailSharingButton.js v1 - Email sharing button with subscription gates

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import EmailSharingModal from './EmailSharingModal';

export default function EmailSharingButton({
                                               shoppingList,
                                               context = 'shopping-list',
                                               contextName = 'Shopping List',
                                               buttonText = '📧 Share via Email',
                                               className = '',
                                               size = 'medium',
                                               variant = 'primary',
                                               disabled = false
                                           }) {
    const [showEmailModal, setShowEmailModal] = useState(false);

    // Subscription hooks
    const subscription = useSubscription();
    const emailGate = useFeatureGate(FEATURE_GATES.EMAIL_SHARING);

    const getSizeClasses = () => {
        switch (size) {
            case 'small': return 'px-3 py-1 text-sm';
            case 'large': return 'px-6 py-3 text-lg';
            default: return 'px-4 py-2 text-base';
        }
    };

    const getVariantClasses = () => {
        switch (variant) {
            case 'secondary': return 'bg-gray-600 hover:bg-gray-700 text-white';
            case 'outline': return 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50';
            case 'ghost': return 'text-blue-600 hover:bg-blue-50';
            default: return 'bg-blue-600 hover:bg-blue-700 text-white';
        }
    };

    const handleEmailSent = (result) => {
        // Optional callback for when email is successfully sent
        console.log('Email sent successfully:', result);
    };

    return (
        <>
            <FeatureGate
                feature={FEATURE_GATES.EMAIL_SHARING}
                fallback={
                    <div className="relative group">
                        <TouchEnhancedButton
                            disabled={true}
                            className={`${getSizeClasses()} ${getVariantClasses()} ${className} opacity-50 cursor-not-allowed relative`}
                        >
                            🔒 {buttonText.replace('📧 ', '')}
                        </TouchEnhancedButton>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-yellow-600 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                            <div className="text-center">
                                <div className="font-semibold mb-1">Gold Feature</div>
                                <div className="mb-2">Share shopping lists, recipes, and meal plans via email with a Gold subscription.</div>
                                <TouchEnhancedButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = '/pricing?source=email-sharing-button';
                                    }}
                                    className="bg-white text-yellow-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100"
                                >
                                    Upgrade Now
                                </TouchEnhancedButton>
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-yellow-600"></div>
                        </div>
                    </div>
                }
            >
                <TouchEnhancedButton
                    onClick={() => setShowEmailModal(true)}
                    disabled={disabled}
                    className={`${getSizeClasses()} ${getVariantClasses()} ${className} font-medium rounded-lg transition-colors flex items-center gap-2 ${
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {buttonText}
                </TouchEnhancedButton>
            </FeatureGate>

            {/* Email Modal */}
            <EmailSharingModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                shoppingList={shoppingList}
                context={context}
                contextName={contextName}
                onEmailSent={handleEmailSent}
            />
        </>
    );
}