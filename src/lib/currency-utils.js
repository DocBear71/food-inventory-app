// file: src/lib/currency-utils.js v1

import {useEffect, useState} from "react";

export const SUPPORTED_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$', position: 'before', decimalPlaces: 2, flag: '🇺🇸', countries: 'United States' },
    { code: 'EUR', name: 'Euro', symbol: '€', position: 'before', decimalPlaces: 2, flag: '🇪🇺', countries: 'European Union' },
    { code: 'GBP', name: 'British Pound', symbol: '£', position: 'before', decimalPlaces: 2, flag: '🇬🇧', countries: 'United Kingdom' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', position: 'before', decimalPlaces: 2, flag: '🇨🇦', countries: 'Canada' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', position: 'before', decimalPlaces: 2, flag: '🇦🇺', countries: 'Australia' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', position: 'before', decimalPlaces: 0, flag: '🇯🇵', countries: 'Japan' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', position: 'after', decimalPlaces: 2, flag: '🇨🇭', countries: 'Switzerland' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', position: 'after', decimalPlaces: 2, flag: '🇸🇪', countries: 'Sweden' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', position: 'after', decimalPlaces: 2, flag: '🇳🇴', countries: 'Norway' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', position: 'after', decimalPlaces: 2, flag: '🇩🇰', countries: 'Denmark' },
    { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', position: 'after', decimalPlaces: 2, flag: '🇵🇱', countries: 'Poland' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', position: 'after', decimalPlaces: 2, flag: '🇨🇿', countries: 'Czech Republic' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', position: 'after', decimalPlaces: 0, flag: '🇭🇺', countries: 'Hungary' },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei', position: 'after', decimalPlaces: 2, flag: '🇷🇴', countries: 'Romania' },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', position: 'after', decimalPlaces: 2, flag: '🇧🇬', countries: 'Bulgaria' },
    { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', position: 'after', decimalPlaces: 2, flag: '🇭🇷', countries: 'Croatia' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', position: 'before', decimalPlaces: 2, flag: '🇳🇿', countries: 'New Zealand' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', position: 'before', decimalPlaces: 2, flag: '🇿🇦', countries: 'South Africa' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', position: 'before', decimalPlaces: 2, flag: '🇧🇷', countries: 'Brazil' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', position: 'before', decimalPlaces: 2, flag: '🇲🇽', countries: 'Mexico' },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$', position: 'before', decimalPlaces: 2, flag: '🇦🇷', countries: 'Argentina' },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$', position: 'before', decimalPlaces: 0, flag: '🇨🇱', countries: 'Chile' },
    { code: 'COP', name: 'Colombian Peso', symbol: '$', position: 'before', decimalPlaces: 0, flag: '🇨🇴', countries: 'Colombia' },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', position: 'before', decimalPlaces: 2, flag: '🇵🇪', countries: 'Peru' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', position: 'before', decimalPlaces: 2, flag: '🇮🇳', countries: 'India' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', position: 'before', decimalPlaces: 2, flag: '🇨🇳', countries: 'China' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', position: 'before', decimalPlaces: 0, flag: '🇰🇷', countries: 'South Korea' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', position: 'before', decimalPlaces: 2, flag: '🇸🇬', countries: 'Singapore' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', position: 'before', decimalPlaces: 2, flag: '🇭🇰', countries: 'Hong Kong' },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', position: 'before', decimalPlaces: 2, flag: '🇹🇼', countries: 'Taiwan' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', position: 'before', decimalPlaces: 2, flag: '🇹🇭', countries: 'Thailand' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', position: 'before', decimalPlaces: 2, flag: '🇵🇭', countries: 'Philippines' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', position: 'before', decimalPlaces: 2, flag: '🇲🇾', countries: 'Malaysia' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', position: 'before', decimalPlaces: 0, flag: '🇮🇩', countries: 'Indonesia' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', position: 'after', decimalPlaces: 0, flag: '🇻🇳', countries: 'Vietnam' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', position: 'after', decimalPlaces: 2, flag: '🇷🇺', countries: 'Russia' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', position: 'before', decimalPlaces: 2, flag: '🇹🇷', countries: 'Turkey' },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', position: 'before', decimalPlaces: 2, flag: '🇮🇱', countries: 'Israel' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', position: 'before', decimalPlaces: 2, flag: '🇦🇪', countries: 'UAE' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', position: 'before', decimalPlaces: 2, flag: '🇸🇦', countries: 'Saudi Arabia' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', position: 'before', decimalPlaces: 2, flag: '🇪🇬', countries: 'Egypt' }
];

export function formatCurrency(amount, userPreferences) {
    if (!amount && amount !== 0) return '0';

    const preferences = userPreferences || {
        currencySymbol: '$',
        currencyPosition: 'before',
        showCurrencyCode: false,
        currency: 'USD',
        decimalPlaces: 2
    };

    const { currencySymbol, currencyPosition, showCurrencyCode, currency, decimalPlaces } = preferences;

    // Convert to number and format with decimal places
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
    const formattedAmount = numericAmount.toFixed(decimalPlaces);

    // Position the symbol
    let formatted = currencyPosition === 'before'
        ? `${currencySymbol}${formattedAmount}`
        : `${formattedAmount}${currencySymbol}`;

    // Add currency code if enabled
    if (showCurrencyCode) {
        formatted = `${formatted} ${currency}`;
    }

    return formatted;
}

export function getCurrencyInfo(currencyCode) {
    return SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
}

export function parseCurrencyInput(input, currentPreferences) {
    // Remove currency symbols and letters, keep only numbers and decimal points
    const cleaned = input.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

// Helper to format example currencies for UI
export function formatCurrencyExample(amount, position, symbol) {
    return position === 'before' ? `${symbol}${amount}` : `${amount}${symbol}`;
}

// React hook to get user's currency preferences
export function useCurrency() {
    const [preferences, setPreferences] = useState(null);

    useEffect(() => {
        fetchUserCurrencyPreferences();
    }, []);

    const fetchUserCurrencyPreferences = async () => {
        try {
            const response = await fetch('/api/user/profile');
            const data = await response.json();
            if (data.user?.currencyPreferences) {
                setPreferences(data.user.currencyPreferences);
            } else {
                // Default preferences
                setPreferences({
                    currency: 'USD',
                    currencySymbol: '$',
                    currencyPosition: 'before',
                    showCurrencyCode: false,
                    decimalPlaces: 2
                });
            }
        } catch (error) {
            console.error('Error fetching currency preferences:', error);
            // Fallback to USD
            setPreferences({
                currency: 'USD',
                currencySymbol: '$',
                currencyPosition: 'before',
                showCurrencyCode: false,
                decimalPlaces: 2
            });
        }
    };

    return {
        preferences,
        formatPrice: (amount) => formatCurrency(amount, preferences),
        parseInput: (input) => parseCurrencyInput(input, preferences),
        refreshPreferences: fetchUserCurrencyPreferences
    };
}