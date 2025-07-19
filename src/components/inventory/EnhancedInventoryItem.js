'use client';

// file: /src/components/inventory/EnhancedInventoryItem.js v1 - Inventory item with nutrition display

import React, { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import InventoryNutritionPanel from './InventoryNutritionPanel';
import {apiPost} from "@/lib/api-config.js";

export default function EnhancedInventoryItem({
                                                  item,
                                                  onUpdate,
                                                  onDelete,
                                                  onNutritionUpdate,
                                                  showNutrition = true,
                                                  compact = false
                                              }) {
    const [showNutritionPanel, setShowNutritionPanel] = useState(false);
    const [showFullDetails, setShowFullDetails] = useState(false);

    const getExpirationStatus = () => {
        if (!item.expirationDate) return null;

        const today = new Date();
        const expDate = new Date(item.expirationDate);
        const daysUntilExpiration = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiration < 0) {
            return { status: 'expired', days: Math.abs(daysUntilExpiration), color: 'text-red-600 bg-red-100' };
        } else if (daysUntilExpiration <= 3) {
            return { status: 'expiring', days: daysUntilExpiration, color: 'text-orange-600 bg-orange-100' };
        } else if (daysUntilExpiration <= 7) {
            return { status: 'good', days: daysUntilExpiration, color: 'text-yellow-600 bg-yellow-100' };
        } else {
            return { status: 'fresh', days: daysUntilExpiration, color: 'text-green-600 bg-green-100' };
        }
    };

    const hasNutritionData = () => {
        return item.nutrition && Object.keys(item.nutrition).length > 0;
    };

    const getNutritionSummary = () => {
        if (!hasNutritionData()) return null;

        const nutrition = item.nutrition;
        const summary = [];

        // Add key nutrients if available
        if (nutrition.calories?.value) {
            summary.push(`${Math.round(nutrition.calories.value)} cal`);
        }
        if (nutrition.protein?.value) {
            summary.push(`${nutrition.protein.value.toFixed(1)}g protein`);
        }
        if (nutrition.carbs?.value) {
            summary.push(`${nutrition.carbs.value.toFixed(1)}g carbs`);
        }
        if (nutrition.fat?.value) {
            summary.push(`${nutrition.fat.value.toFixed(1)}g fat`);
        }

        return summary.length > 0 ? summary.join(' • ') : 'Nutrition data available';
    };

    const handleConsume = async (consumedQuantity = null) => {
        const quantityToConsume = consumedQuantity || item.quantity;

        try {
            // Log nutrition consumption if nutrition data exists
            if (hasNutritionData()) {
                const nutritionConsumed = calculateConsumedNutrition(quantityToConsume);
                await logNutritionConsumption(item._id, nutritionConsumed);
            }

            // Update inventory quantity
            const newQuantity = Math.max(0, item.quantity - quantityToConsume);
            await onUpdate(item._id, { quantity: newQuantity });

        } catch (error) {
            console.error('Error consuming item:', error);
        }
    };

    const calculateConsumedNutrition = (consumedQuantity) => {
        if (!hasNutritionData()) return null;

        const ratio = consumedQuantity / item.quantity;
        const consumedNutrition = {};

        Object.entries(item.nutrition).forEach(([key, value]) => {
            if (value && typeof value === 'object' && value.value !== undefined) {
                consumedNutrition[key] = {
                    ...value,
                    value: value.value * ratio
                };
            } else {
                consumedNutrition[key] = value;
            }
        });

        return {
            ...consumedNutrition,
            itemId: item._id,
            itemName: item.name,
            consumedQuantity,
            totalQuantity: item.quantity,
            consumedAt: new Date()
        };
    };

    const logNutritionConsumption = async (itemId, nutritionData) => {
        try {
            await apiPost('/api/nutrition/consumption', {
                itemId,
                nutritionData,
                consumedAt: new Date()
            });
        } catch (error) {
            console.error('Failed to log nutrition consumption:', error);
        }
    };

    return (
        <div className={`bg-white border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-4'} shadow-sm`}>
            {/* Main Item Display */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    {/* Item Name and Brand */}
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold text-gray-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>
                            {item.name}
                        </h3>
                        {item.brand && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {item.brand}
                            </span>
                        )}
                    </div>

                    {/* Quantity and Category */}
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="font-medium">
                            {item.quantity} {item.unit}
                        </span>
                        {item.category && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {item.category}
                            </span>
                        )}
                    </div>

                    {/* Location and Price */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        {item.location && (
                            <span>📍 {item.location}</span>
                        )}
                        {item.price && (
                            <span>💰 ${item.price.toFixed(2)}</span>
                        )}
                    </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col items-end gap-1">
                    {/* Expiration Status */}
                    {getExpirationStatus() && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getExpirationStatus().color}`}>
                            {getExpirationStatus().status === 'expired'
                                ? `Expired ${getExpirationStatus().days}d ago`
                                : getExpirationStatus().status === 'expiring'
                                    ? `Expires in ${getExpirationStatus().days}d`
                                    : `Fresh (${getExpirationStatus().days}d left)`
                            }
                        </span>
                    )}

                    {/* Nutrition Status */}
                    {hasNutritionData() && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            📊 Nutrition Available
                        </span>
                    )}
                </div>
            </div>

            {/* Nutrition Summary */}
            {showNutrition && hasNutritionData() && !showNutritionPanel && (
                <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 font-medium">
                            {getNutritionSummary()}
                        </span>
                        <TouchEnhancedButton
                            onClick={() => setShowNutritionPanel(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            View Details →
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}

            {/* Expanded Nutrition Panel */}
            {showNutrition && showNutritionPanel && (
                <div className="mb-3">
                    <InventoryNutritionPanel
                        item={item}
                        onNutritionUpdate={onNutritionUpdate}
                        compact={compact}
                        showAnalyzeButton={!hasNutritionData()}
                    />
                    <div className="mt-2 text-center">
                        <TouchEnhancedButton
                            onClick={() => setShowNutritionPanel(false)}
                            className="text-xs text-gray-600 hover:text-gray-700"
                        >
                            ▲ Hide Nutrition
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                    {/* Quick Consume */}
                    <TouchEnhancedButton
                        onClick={() => handleConsume(1)}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                        disabled={item.quantity <= 0}
                    >
                        Use 1
                    </TouchEnhancedButton>

                    {/* Consume All */}
                    {item.quantity > 1 && (
                        <TouchEnhancedButton
                            onClick={() => handleConsume()}
                            className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
                        >
                            Use All
                        </TouchEnhancedButton>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Nutrition Analysis for items without data */}
                    {showNutrition && !hasNutritionData() && !showNutritionPanel && (
                        <InventoryNutritionPanel
                            item={item}
                            onNutritionUpdate={onNutritionUpdate}
                            compact={true}
                            showAnalyzeButton={true}
                        />
                    )}

                    {/* More Details Toggle */}
                    <TouchEnhancedButton
                        onClick={() => setShowFullDetails(!showFullDetails)}
                        className="text-xs text-gray-600 hover:text-gray-700 px-2 py-1 border border-gray-300 rounded"
                    >
                        {showFullDetails ? '▲ Less' : '▼ More'}
                    </TouchEnhancedButton>

                    {/* Edit Button */}
                    <TouchEnhancedButton
                        onClick={() => onUpdate && onUpdate(item._id)}
                        className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-300 rounded"
                    >
                        ✏️ Edit
                    </TouchEnhancedButton>

                    {/* Delete Button */}
                    <TouchEnhancedButton
                        onClick={() => onDelete && onDelete(item._id)}
                        className="text-xs text-red-600 hover:text-red-700 px-2 py-1 border border-red-300 rounded"
                    >
                        🗑️
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Expanded Details */}
            {showFullDetails && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm text-gray-600">
                    {item.notes && (
                        <div>
                            <span className="font-medium">Notes:</span> {item.notes}
                        </div>
                    )}
                    {item.upc && (
                        <div>
                            <span className="font-medium">UPC:</span> {item.upc}
                        </div>
                    )}
                    {item.purchaseDate && (
                        <div>
                            <span className="font-medium">Purchased:</span> {new Date(item.purchaseDate).toLocaleDateString()}
                        </div>
                    )}
                    {item.expirationDate && (
                        <div>
                            <span className="font-medium">Expires:</span> {new Date(item.expirationDate).toLocaleDateString()}
                        </div>
                    )}
                    {item.fdcId && (
                        <div>
                            <span className="font-medium">USDA ID:</span> {item.fdcId}
                        </div>
                    )}
                    <div className="text-xs text-gray-500">
                        <span className="font-medium">Added:</span> {new Date(item.dateAdded).toLocaleDateString()}
                        {item.lastUpdated && (
                            <span className="ml-3">
                                <span className="font-medium">Updated:</span> {new Date(item.lastUpdated).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}