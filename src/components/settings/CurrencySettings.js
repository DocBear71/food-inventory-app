// file: /src/components/settings/CurrencySettings.js v1

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { SUPPORTED_CURRENCIES, formatCurrencyExample } from '@/lib/currency-utils';
import {apiPut} from "@/lib/api-config.js";

export default function CurrencySettings({ user, onUpdate }) {
    const [preferences, setPreferences] = useState({
        currency: 'USD',
        currencySymbol: '$',
        currencyPosition: 'before',
        showCurrencyCode: false,
        decimalPlaces: 2
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.currencyPreferences) {
            setPreferences(user.currencyPreferences);
        }
    }, [user]);

    const handleCurrencyChange = (currencyCode) => {
        const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
        if (currencyInfo) {
            setPreferences(prev => ({
                ...prev,
                currency: currencyCode,
                currencySymbol: currencyInfo.symbol,
                currencyPosition: currencyInfo.position,
                decimalPlaces: currencyInfo.decimalPlaces
            }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await apiPut('/api/user/profile', {
                preferences
            });

            if (response.ok) {
                onUpdate?.();
                alert('Currency preferences saved successfully!');
            } else {
                alert('Failed to save currency preferences');
            }
        } catch (error) {
            console.error('Error saving currency preferences:', error);
            alert('Error saving preferences');
        } finally {
            setSaving(false);
        }
    };

    const getExamplePrice = () => {
        const amount = preferences.decimalPlaces === 0 ? '1234' : '12.34';
        return formatCurrencyExample(amount, preferences.currencyPosition, preferences.currencySymbol);
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">💱 Currency Settings</h3>

            <div className="space-y-6">
                {/* Currency Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Currency
                    </label>
                    <select
                        value={preferences.currency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {SUPPORTED_CURRENCIES.map(currency => (
                            <option key={currency.code} value={currency.code}>
                                {currency.flag} {currency.code} - {currency.name} ({currency.symbol})
                            </option>
                        ))}
                    </select>
                    <p className="text-sm text-gray-600 mt-1">
                        Choose your local currency for price tracking
                    </p>
                </div>

                {/* Currency Symbol */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency Symbol
                    </label>
                    <input
                        type="text"
                        value={preferences.currencySymbol}
                        onChange={(e) => setPreferences(prev => ({...prev, currencySymbol: e.target.value}))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="$"
                        maxLength={5}
                    />
                    <p className="text-sm text-gray-600 mt-1">
                        Symbol used to display prices (e.g., $, €, £)
                    </p>
                </div>

                {/* Symbol Position */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Symbol Position
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="before"
                                checked={preferences.currencyPosition === 'before'}
                                onChange={(e) => setPreferences(prev => ({...prev, currencyPosition: e.target.value}))}
                                className="mr-2"
                            />
                            Before ({formatCurrencyExample('12.34', 'before', preferences.currencySymbol)})
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="after"
                                checked={preferences.currencyPosition === 'after'}
                                onChange={(e) => setPreferences(prev => ({...prev, currencyPosition: e.target.value}))}
                                className="mr-2"
                            />
                            After ({formatCurrencyExample('12.34', 'after', preferences.currencySymbol)})
                        </label>
                    </div>
                </div>

                {/* Decimal Places */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Decimal Places
                    </label>
                    <select
                        value={preferences.decimalPlaces}
                        onChange={(e) => setPreferences(prev => ({...prev, decimalPlaces: parseInt(e.target.value)}))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value={0}>0 (whole numbers only)</option>
                        <option value={2}>2 (standard)</option>
                        <option value={3}>3 (high precision)</option>
                    </select>
                    <p className="text-sm text-gray-600 mt-1">
                        Number of decimal places to show in prices
                    </p>
                </div>

                {/* Show Currency Code */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-gray-900">Show Currency Code</div>
                        <div className="text-sm text-gray-600">Display currency code after prices (e.g., $12.34 USD)</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences.showCurrencyCode}
                            onChange={(e) => setPreferences(prev => ({...prev, showCurrencyCode: e.target.checked}))}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Example price:</span>
                            <span className="font-mono">
                                {getExamplePrice()}{preferences.showCurrencyCode ? ` ${preferences.currency}` : ''}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Large amount:</span>
                            <span className="font-mono">
                                {formatCurrencyExample(
                                    preferences.decimalPlaces === 0 ? '1000' : '1,234.56',
                                    preferences.currencyPosition,
                                    preferences.currencySymbol
                                )}{preferences.showCurrencyCode ? ` ${preferences.currency}` : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <TouchEnhancedButton
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-md font-medium disabled:bg-indigo-400"
                >
                    {saving ? 'Saving...' : 'Save Currency Settings'}
                </TouchEnhancedButton>
            </div>
        </div>
    );
}