'use client';

// file: /src/components/subscription/FeatureGate.js v1 - Component for gating features based on subscription tier

import { useFeatureGate, useUpgradePrompt } from '@/hooks/useSubscription';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function FeatureGate({
                                        feature,
                                        currentCount = null,
                                        children,
                                        fallback = null,
                                        showUpgradePrompt = true,
                                        customMessage = null,
                                        className = ""
                                    }) {
    const featureGate = useFeatureGate(feature, currentCount);
    const { promptUpgrade } = useUpgradePrompt();

    // If user has access and capacity, render children
    if (featureGate.canUse) {
        return children;
    }

    // If fallback is provided, render it
    if (fallback) {
        return fallback;
    }

    // Default upgrade prompt
    if (showUpgradePrompt) {
        return (
            <UpgradePrompt
                feature={feature}
                message={customMessage || featureGate.message}
                requiredTier={featureGate.requiredTier}
                remaining={featureGate.remaining}
                hasAccess={featureGate.hasAccess}
                hasCapacity={featureGate.hasCapacity}
                onUpgrade={() => promptUpgrade(feature)}
                className={className}
            />
        );
    }

    // Don't render anything
    return null;
}

// Upgrade prompt component
function UpgradePrompt({
                           feature,
                           message,
                           requiredTier,
                           remaining,
                           hasAccess,
                           hasCapacity,
                           onUpgrade,
                           className
                       }) {
    const getTierDisplayName = (tier) => {
        return tier.charAt(0).toUpperCase() + tier.slice(1);
    };

    const getPromptType = () => {
        if (!hasAccess) return 'feature';
        if (!hasCapacity) return 'limit';
        return 'feature';
    };

    const promptType = getPromptType();

    return (
        <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                    {promptType === 'limit' ? (
                        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {promptType === 'limit' ? 'Limit Reached' : 'Premium Feature'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        {message}
                    </p>

                    {promptType === 'limit' && remaining !== 'Unlimited' && (
                        <p className="text-xs text-gray-500 mb-3">
                            Remaining this month: {remaining}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                        <TouchEnhancedButton
                            onClick={onUpgrade}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Upgrade to {getTierDisplayName(requiredTier)}
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => window.open('/pricing', '_blank')}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            View All Plans
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Usage limit display component
export function UsageLimitDisplay({ feature, label, className = "" }) {
    const featureGate = useFeatureGate(feature);
    const { usage } = featureGate;

    if (!usage) return null;

    return (
        <div className={`text-xs text-gray-500 ${className}`}>
            {label}: {featureGate.remaining === 'Unlimited' ? 'Unlimited' : featureGate.remaining}
        </div>
    );
}

// Subscription status indicator
export function SubscriptionIndicator({ className = "" }) {
    const { tier, isTrialActive, daysUntilTrialEnd } = useUpgradePrompt();

    const getTierColor = (tier) => {
        switch (tier) {
            case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <div className={`inline-flex items-center space-x-2 ${className}`}>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTierColor(tier)}`}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
                {isTrialActive && ' Trial'}
            </span>
            {isTrialActive && daysUntilTrialEnd !== null && (
                <span className="text-xs text-orange-600 font-medium">
                    {daysUntilTrialEnd} days left
                </span>
            )}
        </div>
    );
}