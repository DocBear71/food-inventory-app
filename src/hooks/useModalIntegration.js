// file: /src/hooks/useModalIntegration.js v1 - Cross-platform Modal integration hooks

import { useState, useCallback } from 'react';

export function useModalIntegration() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const makeRequest = useCallback(async (endpoint, data) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/integrations/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Recipe extraction with nutrition
    const extractRecipeWithNutrition = useCallback(async (videoData) => {
        return makeRequest('enhanced-recipe-import', {
            source: 'social_video',
            data: videoData
        });
    }, [makeRequest]);

    // Receipt processing with inventory suggestions
    const processReceiptWithSuggestions = useCallback(async (receiptData) => {
        return makeRequest('enhanced-recipe-import', {
            source: 'receipt_items',
            data: receiptData
        });
    }, [makeRequest]);

    // Nutrition analysis
    const analyzeNutrition = useCallback(async (type, data) => {
        return makeRequest('nutrition-analysis', {
            type,
            data
        });
    }, [makeRequest]);

    // Smart inventory operations
    const performSmartInventoryAction = useCallback(async (action, data) => {
        return makeRequest('smart-inventory', {
            action,
            data
        });
    }, [makeRequest]);

    return {
        loading,
        error,
        extractRecipeWithNutrition,
        processReceiptWithSuggestions,
        analyzeNutrition,
        performSmartInventoryAction,
        clearError: () => setError(null)
    };
}