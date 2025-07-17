// file: src/contexts/CurrencyContext.js v1

import { createContext, useContext, useState, useEffect } from 'react';
import { formatCurrency, getCurrencyInfo, SUPPORTED_CURRENCIES } from '@/lib/currency-utils';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);

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
            setPreferences({
                currency: 'USD',
                currencySymbol: '$',
                currencyPosition: 'before',
                showCurrencyCode: false,
                decimalPlaces: 2
            });
        } finally {
            setLoading(false);
        }
    };

    const updatePreferences = async (newPreferences) => {
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currencyPreferences: newPreferences })
            });

            if (response.ok) {
                setPreferences(newPreferences);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating currency preferences:', error);
            return false;
        }
    };

    const formatPrice = (amount) => formatCurrency(amount, preferences);

    const value = {
        preferences,
        loading,
        formatPrice,
        updatePreferences,
        refreshPreferences: fetchUserCurrencyPreferences,
        supportedCurrencies: SUPPORTED_CURRENCIES
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}

