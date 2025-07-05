'use client';
// file: /src/components/recipes/PublicRecipeCheckbox.js v1 - Enhanced public recipe checkbox with subscription gates

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { apiGet } from '@/lib/api-config';

export default function PublicRecipeCheckbox({
                                                 isPublic,
                                                 onChange,
                                                 disabled = false,
                                                 className = ''
                                             }) {
    const [publicRecipeStats, setPublicRecipeStats] = useState({
        current: 0,
        limit: 0,
        tier: 'free'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPublicRecipeStats();
    }, []);

    const fetchPublicRecipeStats = async () => {
        try {
            const response = await apiGet('/api/recipes/public-stats');
            const data = await response.json();

            if (data.success) {
                setPublicRecipeStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching public recipe stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (checked) => {
        if (!checked) {
            // Always allow making recipes private
            onChange(checked);
            return;
        }

        // Check if user can make recipes public
        if (publicRecipeStats.tier === 'free') {
            // Show upgrade prompt for free users
            return;
        }

        if (publicRecipeStats.tier === 'gold' && publicRecipeStats.current >= publicRecipeStats.limit) {
            // Show limit reached message for Gold users
            return;
        }

        // Allow making public
        onChange(checked);
    };

    return (
        <FeatureGate
            feature={FEATURE_GATES.PUBLIC_RECIPES}
            fallback={
                <div className={`space-y-3 ${className}`}>
                    <div className="flex items-start">
                        <div className="flex items-center h-5">
                            <input
                                type="checkbox"
                                checked={false}
                                disabled={true}
                                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded opacity-50 cursor-not-allowed"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label className="font-medium text-gray-400">
                                Make this recipe public
                            </label>
                            <p className="text-gray-400">
                                Public recipes are available with Gold and Platinum plans
                            </p>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-sm text-yellow-800">
                            <strong>🎯 Unlock Public Recipes with Gold:</strong>
                            <ul className="mt-2 space-y-1">
                                <li>• Share up to 25 recipes with the community</li>
                                <li>• Get ratings and reviews from other users</li>
                                <li>• Build your cooking reputation</li>
                                <li>• Help others discover great recipes</li>
                            </ul>
                        </div>
                        <div className="mt-3">
                            <TouchEnhancedButton
                                onClick={() => window.location.href = '/pricing?source=public-recipes'}
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-md font-medium hover:from-yellow-500 hover:to-orange-600"
                            >
                                🚀 Upgrade to Gold
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            }
        >
            <div className={`space-y-3 ${className}`}>
                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input
                            id="isPublic"
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => handleChange(e.target.checked)}
                            disabled={disabled || loading}
                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="isPublic" className="font-medium text-gray-700">
                            Make this recipe public
                        </label>
                        <p className="text-gray-500">
                            Public recipes can be viewed and rated by other users
                        </p>
                    </div>
                </div>

                {/* Usage Stats for Gold/Platinum Users */}
                {!loading && publicRecipeStats.tier !== 'free' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-sm text-blue-800">
                            {publicRecipeStats.tier === 'gold' ? (
                                <>
                                    <strong>📊 Public Recipe Usage:</strong> {publicRecipeStats.current} of {publicRecipeStats.limit} used
                                    {publicRecipeStats.current >= publicRecipeStats.limit && (
                                        <div className="mt-2">
                                            <p className="text-orange-700 font-medium">
                                                ⚠️ Gold limit reached! Upgrade to Platinum for unlimited public recipes.
                                            </p>
                                            <TouchEnhancedButton
                                                onClick={() => window.location.href = '/pricing?source=public-recipe-limit'}
                                                className="mt-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-md text-xs font-medium"
                                            >
                                                Upgrade to Platinum
                                            </TouchEnhancedButton>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <strong>💎 Platinum:</strong> Unlimited public recipes ({publicRecipeStats.current} published)
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Limit Warning for Gold Users Near Limit */}
                {!loading && publicRecipeStats.tier === 'gold' &&
                    publicRecipeStats.current >= publicRecipeStats.limit - 3 &&
                    publicRecipeStats.current < publicRecipeStats.limit && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="text-sm text-orange-800">
                                <strong>⚠️ Approaching Limit:</strong> You have {publicRecipeStats.limit - publicRecipeStats.current} public recipe slots remaining.
                                <div className="mt-2">
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/pricing?source=public-recipe-warning'}
                                        className="text-orange-700 hover:text-orange-900 underline text-xs"
                                    >
                                        Upgrade to Platinum for unlimited public recipes
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    )}
            </div>
        </FeatureGate>
    );
}